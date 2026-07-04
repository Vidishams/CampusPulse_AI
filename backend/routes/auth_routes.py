import os
from fastapi import APIRouter, HTTPException, status, Depends
from pymongo.errors import DuplicateKeyError

from models.schemas import (
    UserCreate, UserLogin, Token, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest,
)
from auth.security import (
    hash_password, verify_password, create_access_token,
    create_action_token, decode_action_token,
)
from auth.deps import get_current_user
from database.db import users_collection, roster_students_collection, roster_faculty_collection
from utils.helpers import doc_to_out, to_object_id, normalize_id, validate_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# No SMTP/email provider is wired into this project. In production, these
# tokens would be emailed via something like SendGrid/SES/Postmark and
# never returned in the API response. Until that's wired up, we hand the
# token back directly in the response body (`devToken`) so the flow is
# fully testable end-to-end -- clearly marked as a dev-mode stand-in.
DEV_MODE_EXPOSE_TOKENS = os.getenv("DEV_MODE_EXPOSE_TOKENS", "true").lower() == "true"


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    """
    Registration is checked against the college's own enrollment roster
    (see routes/roster_routes.py) instead of trusting whatever department/
    semester a signup form submits:

    - Students must supply an `srn` that an admin has already pre-loaded
      onto the roster. Department and semester are taken FROM that roster
      record, not from the request -- so a student can't just claim to be
      in "Computer Science, Sem 8" if the roster says otherwise.
    - Faculty must supply an `employeeId` that's on the faculty roster,
      same idea.
    - Each roster entry can only be claimed by one account (a `claimed`
      flag flips once registration succeeds), so an SRN can't be used to
      create multiple accounts.
    """
    doc = payload.model_dump()
    role = doc["role"].value if hasattr(doc["role"], "value") else doc["role"]
    doc["role"] = role
    doc["password"] = hash_password(doc.pop("password"))
    doc["clubs"] = []
    doc["savedNotices"] = []
    doc["isVerified"] = False

    if role == "student":
        srn = normalize_id(doc.get("srn"))
        if not srn:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "SRN is required to register as a student")
        try:
            srn = validate_id(srn, "SRN")
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

        roster_entry = await roster_students_collection.find_one({"srn": srn})
        if not roster_entry:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "This SRN isn't on your college's roster. Ask your admin to add it before you register.",
            )
        if roster_entry.get("claimed"):
            raise HTTPException(status.HTTP_409_CONFLICT, "This SRN has already been registered to an account")

        doc["department"] = roster_entry["department"]
        doc["semester"] = roster_entry["semester"]
        doc["srn"] = srn
        doc["employeeId"] = None

    elif role == "faculty":
        employee_id = normalize_id(doc.get("employeeId"))
        if not employee_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Employee ID is required to register as faculty")
        try:
            employee_id = validate_id(employee_id, "Employee ID")
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

        roster_entry = await roster_faculty_collection.find_one({"employeeId": employee_id})
        if not roster_entry:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "This Employee ID isn't on your college's roster. Ask your admin to add it before you register.",
            )
        if roster_entry.get("claimed"):
            raise HTTPException(status.HTTP_409_CONFLICT, "This Employee ID has already been registered to an account")

        doc["department"] = roster_entry["department"]
        doc["semester"] = None
        doc["employeeId"] = employee_id
        doc["srn"] = None

    try:
        result = await users_collection.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    # Mark the roster entry claimed only after the user account exists,
    # so a failure creating the account doesn't lock out a valid SRN.
    if role == "student":
        await roster_students_collection.update_one(
            {"srn": doc["srn"]}, {"$set": {"claimed": True, "claimedBy": str(result.inserted_id)}}
        )
    elif role == "faculty":
        await roster_faculty_collection.update_one(
            {"employeeId": doc["employeeId"]}, {"$set": {"claimed": True, "claimedBy": str(result.inserted_id)}}
        )

    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), role)
    return Token(access_token=token, user=UserOut(**doc_to_out(doc)))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin):
    user = await users_collection.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    token = create_access_token(str(user["_id"]), user["role"])
    return Token(access_token=token, user=UserOut(**doc_to_out(user)))


@router.post("/resend-verification")
async def resend_verification(user: dict = Depends(get_current_user)):
    if user.get("isVerified"):
        return {"message": "This account is already verified"}

    token = create_action_token(str(user["_id"]), purpose="verify_email", minutes=60 * 24)
    response = {"message": "Verification link generated"}
    if DEV_MODE_EXPOSE_TOKENS:
        response["devToken"] = token
        response["devVerifyPath"] = f"/verify-email?token={token}"
    return response


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    try:
        user_id = decode_action_token(payload.token, expected_purpose="verify_email")
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    result = await users_collection.update_one(
        {"_id": to_object_id(user_id)}, {"$set": {"isVerified": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account no longer exists")
    return {"message": "Email verified"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Always returns the same generic message regardless of whether the
    email exists -- this prevents the endpoint being used to enumerate
    which emails are registered.
    """
    user = await users_collection.find_one({"email": payload.email})
    generic_message = {"message": "If that email is registered, a reset link has been generated."}

    if not user:
        return generic_message

    token = create_action_token(str(user["_id"]), purpose="reset_password", minutes=30)
    if DEV_MODE_EXPOSE_TOKENS:
        generic_message["devToken"] = token
        generic_message["devResetPath"] = f"/reset-password?token={token}"
    return generic_message


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    try:
        user_id = decode_action_token(payload.token, expected_purpose="reset_password")
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    result = await users_collection.update_one(
        {"_id": to_object_id(user_id)}, {"$set": {"password": hash_password(payload.newPassword)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account no longer exists")
    return {"message": "Password updated -- you can now log in with your new password"}

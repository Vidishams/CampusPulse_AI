from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from models.schemas import UserOut, UserUpdate, RoleUpdate
from auth.deps import get_current_user, require_role
from database.db import users_collection
from utils.helpers import doc_to_out, to_object_id

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_my_profile(user: dict = Depends(get_current_user)):
    return UserOut(**doc_to_out(user))


@router.put("/me", response_model=UserOut)
async def update_my_profile(payload: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update_data:
        await users_collection.update_one({"_id": user["_id"]}, {"$set": update_data})
    updated = await users_collection.find_one({"_id": user["_id"]})
    return UserOut(**doc_to_out(updated))


@router.get("", response_model=List[UserOut])
async def list_users(role: str = None, admin: dict = Depends(require_role("admin"))):
    query = {"role": role} if role else {}
    cursor = users_collection.find(query)
    return [UserOut(**doc_to_out(u)) async for u in cursor]


@router.patch("/{user_id}/role", response_model=UserOut)
async def change_user_role(user_id: str, payload: RoleUpdate, admin: dict = Depends(require_role("admin"))):
    """
    The only way to grant/revoke admin access after the very first admin
    is seeded (see backend/scripts/create_admin.py). Public registration
    never accepts role=admin -- see PublicRole in models/schemas.py.
    """
    if str(admin["_id"]) == user_id and payload.role != "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't demote your own account")

    result = await users_collection.update_one(
        {"_id": to_object_id(user_id)}, {"$set": {"role": payload.role.value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    updated = await users_collection.find_one({"_id": to_object_id(user_id)})
    return UserOut(**doc_to_out(updated))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, admin: dict = Depends(require_role("admin"))):
    result = await users_collection.delete_one({"_id": to_object_id(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

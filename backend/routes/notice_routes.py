from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status

from models.schemas import NoticeCreate, NoticeOut, RejectNotice
from auth.deps import get_current_user, require_role
from database.db import notices_collection, users_collection, notifications_collection
from utils.helpers import doc_to_out, to_object_id
from ai import ocr, summarizer, categorizer
from realtime.manager import notify_users

router = APIRouter(prefix="/api/notices", tags=["Notices"])


async def _notify_eligible_students(notice: dict):
    """
    Fan out a real-time + persisted notification to every student eligible
    for this notice. Only ever called once a notice is APPROVED -- either
    immediately (admin-authored notices) or when an admin approves a
    faculty submission (see /approve below).
    """
    query = {"role": "student"}
    if notice.get("department"):
        query["department"] = notice["department"]
    if notice.get("semester"):
        query["semester"] = notice["semester"]

    eligible_ids = [str(u["_id"]) async for u in users_collection.find(query, {"_id": 1})]
    if not eligible_ids:
        return

    message = f"New {notice['category']} notice: {notice['title']}"
    notif_docs = [
        {
            "userId": uid,
            "message": message,
            "noticeId": str(notice["_id"]),
            "isRead": False,
            "createdAt": datetime.utcnow(),
        }
        for uid in eligible_ids
    ]
    await notifications_collection.insert_many(notif_docs)
    await notify_users(eligible_ids, {
        "message": message,
        "noticeId": str(notice["_id"]),
        "category": notice["category"],
    })


async def _process_and_store(title: str, raw_text: str, uploader: dict,
                              department: Optional[str], semester: Optional[int],
                              deadline: Optional[datetime], attachments: List[str]):
    """
    Shared pipeline for both manual and file-upload notice creation:
    categorize -> extract structured fields -> summarize -> persist.

    Approval gate: admin-authored notices are auto-approved (an admin is
    already the approver, so there's no one above them to check with).
    Faculty-authored notices are stored as "pending" and are invisible to
    students and silent (no notifications) until an admin approves them
    via POST /api/notices/{id}/approve.
    """
    category = categorizer.categorize(raw_text)
    fields = categorizer.extract_fields(raw_text)
    summary = summarizer.summarize(raw_text)

    is_admin = uploader["role"] == "admin"

    doc = {
        "title": title,
        "description": raw_text,
        "summary": summary,
        "category": category,
        "department": department,
        "semester": semester,
        "deadline": deadline,
        "venue": fields.get("venue"),
        "eligibility": fields.get("eligibility"),
        "actionRequired": fields.get("actionRequired"),
        "uploadedBy": str(uploader["_id"]),
        "uploadDate": datetime.utcnow(),
        "attachments": attachments,
        "views": 0,
        "status": "approved" if is_admin else "pending",
        "rejectionReason": None,
    }
    result = await notices_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    if is_admin:
        await _notify_eligible_students(doc)

    return doc


@router.post("", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
async def create_notice(payload: NoticeCreate, user: dict = Depends(require_role("faculty", "admin"))):
    doc = await _process_and_store(
        title=payload.title,
        raw_text=payload.description,
        uploader=user,
        department=payload.department,
        semester=payload.semester,
        deadline=payload.deadline,
        attachments=[],
    )
    return NoticeOut(**doc_to_out(doc))


@router.post("/upload", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
async def upload_notice(
    title: str = Form(...),
    department: Optional[str] = Form(None),
    semester: Optional[int] = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(require_role("faculty", "admin")),
):
    """Faculty uploads a PDF/DOCX/image; we OCR + AI-process it end to end."""
    file_bytes = await file.read()
    try:
        raw_text = ocr.extract_text(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not raw_text.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                             "Could not extract any text from this file")

    doc = await _process_and_store(
        title=title,
        raw_text=raw_text,
        uploader=user,
        department=department,
        semester=semester,
        deadline=None,
        attachments=[file.filename],
    )
    return NoticeOut(**doc_to_out(doc))


@router.get("/feed", response_model=List[NoticeOut])
async def personalized_feed(user: dict = Depends(get_current_user)):
    """
    Each student's feed = APPROVED notices with no department restriction,
    OR their department, AND (no semester restriction OR their semester).
    Pending/rejected notices never reach this endpoint.
    """
    query = {
        "status": "approved",
        "$and": [
            {"$or": [{"department": None}, {"department": user.get("department")}]},
            {"$or": [{"semester": None}, {"semester": user.get("semester")}]},
        ],
    }
    cursor = notices_collection.find(query).sort("uploadDate", -1).limit(50)
    return [NoticeOut(**doc_to_out(n)) async for n in cursor]


@router.get("/pending", response_model=List[NoticeOut])
async def list_pending_notices(admin: dict = Depends(require_role("admin"))):
    """Admin's approval queue."""
    cursor = notices_collection.find({"status": "pending"}).sort("uploadDate", 1)
    return [NoticeOut(**doc_to_out(n)) async for n in cursor]


@router.patch("/{notice_id}/approve", response_model=NoticeOut)
async def approve_notice(notice_id: str, admin: dict = Depends(require_role("admin"))):
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")
    if notice["status"] == "approved":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Notice is already approved")

    await notices_collection.update_one(
        {"_id": notice["_id"]}, {"$set": {"status": "approved", "rejectionReason": None}}
    )
    notice["status"] = "approved"
    await _notify_eligible_students(notice)

    updated = await notices_collection.find_one({"_id": notice["_id"]})
    return NoticeOut(**doc_to_out(updated))


@router.patch("/{notice_id}/reject", response_model=NoticeOut)
async def reject_notice(notice_id: str, payload: RejectNotice, admin: dict = Depends(require_role("admin"))):
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")

    await notices_collection.update_one(
        {"_id": notice["_id"]},
        {"$set": {"status": "rejected", "rejectionReason": payload.reason}},
    )
    updated = await notices_collection.find_one({"_id": notice["_id"]})
    return NoticeOut(**doc_to_out(updated))


@router.get("", response_model=List[NoticeOut])
async def list_notices(category: Optional[str] = None, department: Optional[str] = None):
    """Public listing -- only ever shows approved notices."""
    query = {"status": "approved"}
    if category:
        query["category"] = category
    if department:
        query["department"] = department
    cursor = notices_collection.find(query).sort("uploadDate", -1)
    return [NoticeOut(**doc_to_out(n)) async for n in cursor]


@router.get("/mine", response_model=List[NoticeOut])
async def my_notices(user: dict = Depends(require_role("faculty", "admin"))):
    """Faculty/admin's own submissions, in any status -- powers their dashboard."""
    cursor = notices_collection.find({"uploadedBy": str(user["_id"])}).sort("uploadDate", -1)
    return [NoticeOut(**doc_to_out(n)) async for n in cursor]


@router.get("/{notice_id}", response_model=NoticeOut)
async def get_notice(notice_id: str, user: dict = Depends(get_current_user)):
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")

    is_owner_or_admin = user["role"] == "admin" or notice["uploadedBy"] == str(user["_id"])
    if notice["status"] != "approved" and not is_owner_or_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")

    if notice["status"] == "approved":
        await notices_collection.update_one({"_id": notice["_id"]}, {"$inc": {"views": 1}})
    return NoticeOut(**doc_to_out(notice))


@router.put("/{notice_id}", response_model=NoticeOut)
async def update_notice(notice_id: str, payload: NoticeCreate,
                         user: dict = Depends(require_role("faculty", "admin"))):
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")
    if user["role"] == "faculty" and notice["uploadedBy"] != str(user["_id"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit notices you created")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if user["role"] == "faculty":
        update_data["status"] = "pending"
        update_data["rejectionReason"] = None

    await notices_collection.update_one({"_id": notice["_id"]}, {"$set": update_data})
    updated = await notices_collection.find_one({"_id": notice["_id"]})
    return NoticeOut(**doc_to_out(updated))


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notice(notice_id: str, user: dict = Depends(require_role("faculty", "admin"))):
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notice not found")
    if user["role"] == "faculty" and notice["uploadedBy"] != str(user["_id"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete notices you created")
    await notices_collection.delete_one({"_id": notice["_id"]})

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import NotificationOut
from auth.deps import get_current_user
from database.db import notifications_collection
from utils.helpers import doc_to_out, to_object_id

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
async def list_notifications(user: dict = Depends(get_current_user)):
    cursor = notifications_collection.find({"userId": str(user["_id"])}).sort("createdAt", -1).limit(50)
    return [NotificationOut(**doc_to_out(n)) async for n in cursor]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    await notifications_collection.update_one(
        {"_id": to_object_id(notification_id), "userId": str(user["_id"])},
        {"$set": {"isRead": True}},
    )
    return {"message": "Marked as read"}


@router.patch("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await notifications_collection.update_many(
        {"userId": str(user["_id"]), "isRead": False}, {"$set": {"isRead": True}}
    )
    return {"message": "All notifications marked as read"}

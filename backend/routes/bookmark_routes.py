from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from models.schemas import BookmarkCreate, NoticeOut
from auth.deps import get_current_user
from database.db import bookmarks_collection, notices_collection
from utils.helpers import doc_to_out, to_object_id

router = APIRouter(prefix="/api/bookmarks", tags=["Bookmarks"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_bookmark(payload: BookmarkCreate, user: dict = Depends(get_current_user)):
    try:
        await bookmarks_collection.insert_one({
            "userId": str(user["_id"]),
            "noticeId": payload.noticeId,
        })
    except Exception:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already bookmarked")
    return {"message": "Bookmarked"}


@router.get("", response_model=List[NoticeOut])
async def list_bookmarks(user: dict = Depends(get_current_user)):
    bookmark_docs = bookmarks_collection.find({"userId": str(user["_id"])})
    notice_ids = [to_object_id(b["noticeId"]) async for b in bookmark_docs]
    if not notice_ids:
        return []
    cursor = notices_collection.find({"_id": {"$in": notice_ids}})
    return [NoticeOut(**doc_to_out(n)) async for n in cursor]


@router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bookmark(notice_id: str, user: dict = Depends(get_current_user)):
    await bookmarks_collection.delete_one({"userId": str(user["_id"]), "noticeId": notice_id})

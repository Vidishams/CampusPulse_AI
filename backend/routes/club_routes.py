from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from models.schemas import ClubCreate, ClubOut
from auth.deps import get_current_user, require_role
from database.db import clubs_collection, users_collection
from utils.helpers import doc_to_out, to_object_id

router = APIRouter(prefix="/api/clubs", tags=["Clubs"])


@router.post("", response_model=ClubOut, status_code=status.HTTP_201_CREATED)
async def create_club(payload: ClubCreate, user: dict = Depends(require_role("faculty", "admin"))):
    doc = payload.model_dump()
    doc["members"] = []
    result = await clubs_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ClubOut(**doc_to_out(doc))


@router.get("", response_model=List[ClubOut])
async def list_clubs():
    cursor = clubs_collection.find({})
    return [ClubOut(**doc_to_out(c)) async for c in cursor]


@router.post("/{club_id}/join")
async def join_club(club_id: str, user: dict = Depends(get_current_user)):
    club = await clubs_collection.find_one({"_id": to_object_id(club_id)})
    if not club:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Club not found")
    await clubs_collection.update_one({"_id": club["_id"]}, {"$addToSet": {"members": str(user["_id"])}})
    await users_collection.update_one({"_id": user["_id"]}, {"$addToSet": {"clubs": club_id}})
    return {"message": f"Joined {club['name']}"}

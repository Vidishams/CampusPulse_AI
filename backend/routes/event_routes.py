from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from models.schemas import EventCreate, EventOut
from auth.deps import get_current_user, require_role
from database.db import events_collection
from utils.helpers import doc_to_out, to_object_id

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreate, user: dict = Depends(require_role("faculty", "admin"))):
    doc = payload.model_dump()
    doc["createdBy"] = str(user["_id"])
    result = await events_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return EventOut(**doc_to_out(doc))


@router.get("", response_model=List[EventOut])
async def list_events(department: Optional[str] = None):
    query = {"department": department} if department else {}
    cursor = events_collection.find(query).sort("date", 1)
    return [EventOut(**doc_to_out(e)) async for e in cursor]


@router.get("/recommended", response_model=List[EventOut])
async def recommended_events(user: dict = Depends(get_current_user)):
    """
    Simple content-based recommendation: score events by overlap between
    the event's tags and the student's interests, break ties by matching
    department. This is intentionally simple (no ML model, no cold-start
    problem) -- swap in a proper collaborative-filtering model later once
    there's enough "previously attended events" data to train on.
    """
    interests = set(i.lower() for i in user.get("interests", []))
    cursor = events_collection.find({})
    scored = []
    async for e in cursor:
        tag_overlap = len(interests.intersection(t.lower() for t in e.get("tags", [])))
        dept_match = 1 if e.get("department") == user.get("department") else 0
        score = tag_overlap * 2 + dept_match
        scored.append((score, e))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [EventOut(**doc_to_out(e)) for _, e in scored[:20]]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: str, user: dict = Depends(require_role("faculty", "admin"))):
    result = await events_collection.delete_one({"_id": to_object_id(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")

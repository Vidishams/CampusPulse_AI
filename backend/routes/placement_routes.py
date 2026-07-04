from typing import List
from fastapi import APIRouter, Depends, status

from models.schemas import PlacementCreate, PlacementOut
from auth.deps import require_role
from database.db import placements_collection
from utils.helpers import doc_to_out

router = APIRouter(prefix="/api/placements", tags=["Placements"])


@router.post("", response_model=PlacementOut, status_code=status.HTTP_201_CREATED)
async def create_placement(payload: PlacementCreate, user: dict = Depends(require_role("faculty", "admin"))):
    doc = payload.model_dump()
    result = await placements_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return PlacementOut(**doc_to_out(doc))


@router.get("", response_model=List[PlacementOut])
async def list_placements():
    cursor = placements_collection.find({}).sort("deadline", 1)
    return [PlacementOut(**doc_to_out(p)) async for p in cursor]

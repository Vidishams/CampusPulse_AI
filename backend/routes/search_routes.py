from typing import List, Optional
from fastapi import APIRouter, Query

from models.schemas import NoticeOut
from database.db import notices_collection
from utils.helpers import doc_to_out
from ai.categorizer import CATEGORY_KEYWORDS

router = APIRouter(prefix="/api/search", tags=["Search"])


def _infer_filters_from_query(q: str) -> dict:
    """
    Turns a free-text query like "placement drives this month" into a
    Mongo filter: {category: "Placement"} + a text-search fallback for
    the rest. This is the same keyword-scoring idea used in categorizer.py,
    reused here so "AI workshops" resolves to category=Workshop plus a
    text match on "AI".
    """
    lowered = q.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            return {"category": category}
    return {}


@router.get("", response_model=List[NoticeOut])
async def search_notices(q: str = Query(..., min_length=1), department: Optional[str] = None):
    filters = _infer_filters_from_query(q)
    filters["$text"] = {"$search": q}
    if department:
        filters["department"] = department

    cursor = notices_collection.find(filters, {"score": {"$meta": "textScore"}}).sort(
        [("score", {"$meta": "textScore"})]
    )
    results = [NoticeOut(**doc_to_out(n)) async for n in cursor]

    if not results:
        # Text index found nothing (e.g. query too short) -> fall back to
        # a plain category-only match so the user still gets something useful
        fallback = {k: v for k, v in filters.items() if k != "$text"}
        cursor = notices_collection.find(fallback).sort("uploadDate", -1).limit(20)
        results = [NoticeOut(**doc_to_out(n)) async for n in cursor]

    return results

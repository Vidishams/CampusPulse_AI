"""
AI Campus Assistant.

Deliberately NOT a free-form LLM call: the spec requires "answers only
using data available in the database", so this is a retrieval-first
design -- classify intent -> query Mongo -> template the answer from real
documents. This guarantees the bot can never hallucinate an exam date
that doesn't exist, which matters a lot more for a college tool than
open-ended fluency. A generative model can be layered on top later purely
to *phrase* the retrieved facts more naturally, without touching what
facts get surfaced.
"""
from datetime import datetime
from fastapi import APIRouter, Depends

from models.schemas import ChatRequest, ChatResponse
from auth.deps import get_current_user
from database.db import notices_collection, events_collection, chats_collection

router = APIRouter(prefix="/api/chat", tags=["AI Assistant"])

INTENT_KEYWORDS = {
    "exam": ["exam", "test"],
    "event_today_tomorrow": ["today", "tomorrow", "this week"],
    "placement": ["placement", "drive", "company", "hiring"],
    "deadline": ["deadline", "due", "last date"],
}


def _detect_intent(question: str) -> str:
    lowered = question.lower()
    for intent, kws in INTENT_KEYWORDS.items():
        if any(kw in lowered for kw in kws):
            return intent
    return "general"


@router.post("", response_model=ChatResponse)
async def ask_assistant(payload: ChatRequest, user: dict = Depends(get_current_user)):
    intent = _detect_intent(payload.question)
    dept = user.get("department")
    answer = "I couldn't find anything matching that in the current notices or events."
    sources = []

    if intent == "exam":
        cursor = notices_collection.find(
            {"category": "Exam", "$or": [{"department": None}, {"department": dept}]}
        ).sort("deadline", 1).limit(5)
        notices = [n async for n in cursor]
        if notices:
            lines = [f"- {n['title']}" + (f" (deadline: {n['deadline']})" if n.get("deadline") else "")
                     for n in notices]
            answer = "Here are the upcoming exam notices for you:\n" + "\n".join(lines)
            sources = [str(n["_id"]) for n in notices]

    elif intent == "event_today_tomorrow":
        cursor = events_collection.find({}).sort("date", 1).limit(5)
        events = [e async for e in cursor]
        if events:
            lines = [f"- {e['title']} at {e['venue']} on {e['date']}" for e in events]
            answer = "Here are the upcoming events:\n" + "\n".join(lines)
            sources = [str(e["_id"]) for e in events]

    elif intent == "placement":
        cursor = notices_collection.find(
            {"category": "Placement", "$or": [{"department": None}, {"department": dept}]}
        ).sort("uploadDate", -1).limit(5)
        notices = [n async for n in cursor]
        if notices:
            lines = [f"- {n['title']}" for n in notices]
            answer = "Here are the current placement drives:\n" + "\n".join(lines)
            sources = [str(n["_id"]) for n in notices]

    elif intent == "deadline":
        cursor = notices_collection.find(
            {"deadline": {"$ne": None}, "$or": [{"department": None}, {"department": dept}]}
        ).sort("deadline", 1).limit(5)
        notices = [n async for n in cursor]
        if notices:
            lines = [f"- {n['title']} — due {n['deadline']}" for n in notices]
            answer = "Here are your nearest deadlines:\n" + "\n".join(lines)
            sources = [str(n["_id"]) for n in notices]

    else:
        cursor = notices_collection.find(
            {"$text": {"$search": payload.question}, "$or": [{"department": None}, {"department": dept}]}
        ).limit(5)
        notices = [n async for n in cursor]
        if notices:
            lines = [f"- {n['title']}: {n.get('summary', '')}" for n in notices]
            answer = "Here's what I found:\n" + "\n".join(lines)
            sources = [str(n["_id"]) for n in notices]

    await chats_collection.insert_one({
        "userId": str(user["_id"]),
        "question": payload.question,
        "answer": answer,
        "createdAt": datetime.utcnow(),
    })

    return ChatResponse(answer=answer, sources=sources)

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends

from auth.deps import require_role
from database.db import users_collection, notices_collection, events_collection

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/admin")
async def admin_analytics(admin: dict = Depends(require_role("admin"))):
    total_students = await users_collection.count_documents({"role": "student"})
    total_faculty = await users_collection.count_documents({"role": "faculty"})
    total_notices = await notices_collection.count_documents({})
    total_events = await events_collection.count_documents({})

    dept_pipeline = [
        {"$match": {"role": "student"}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
    ]
    dept_activity = [d async for d in users_collection.aggregate(dept_pipeline)]

    top_notices_cursor = notices_collection.find({}).sort("views", -1).limit(5)
    top_notices = [{"title": n["title"], "views": n.get("views", 0)} async for n in top_notices_cursor]

    return {
        "totalStudents": total_students,
        "totalFaculty": total_faculty,
        "totalNotices": total_notices,
        "totalEvents": total_events,
        "departmentActivity": dept_activity,
        "mostViewedNotices": top_notices,
    }


@router.get("/faculty/{notice_id}")
async def faculty_notice_analytics(notice_id: str, user: dict = Depends(require_role("faculty", "admin"))):
    """Per-notice reach/engagement, used for the 'Notice Views / Read %' faculty view."""
    from utils.helpers import to_object_id
    notice = await notices_collection.find_one({"_id": to_object_id(notice_id)})
    if not notice:
        return {"error": "Notice not found"}

    eligible_query = {"role": "student"}
    if notice.get("department"):
        eligible_query["department"] = notice["department"]
    if notice.get("semester"):
        eligible_query["semester"] = notice["semester"]
    eligible_count = await users_collection.count_documents(eligible_query)
    views = notice.get("views", 0)
    read_pct = round((views / eligible_count) * 100, 1) if eligible_count else 0

    return {
        "title": notice["title"],
        "views": views,
        "eligibleStudents": eligible_count,
        "readPercentage": read_pct,
    }

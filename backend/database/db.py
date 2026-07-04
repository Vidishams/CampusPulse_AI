"""
Central place that owns the MongoDB client and exposes each collection.

Why Motor (async) instead of PyMongo directly?
FastAPI is an async framework -- if we used the blocking PyMongo driver on
the request path, every DB call would tie up a worker thread. Motor gives us
non-blocking calls so the server can handle many concurrent requests
(important for something like the notification fan-out on notice upload).
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "campuspulse")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# One handle per collection so routes just import the name they need
users_collection = db["users"]
notices_collection = db["notices"]
events_collection = db["events"]
bookmarks_collection = db["bookmarks"]
notifications_collection = db["notifications"]
chats_collection = db["chats"]
clubs_collection = db["clubs"]
placements_collection = db["placements"]
roster_students_collection = db["roster_students"]
roster_faculty_collection = db["roster_faculty"]


async def ensure_indexes():
    """
    Call once on startup. Indexes make the difference between a query
    scanning the whole collection vs. hitting a B-tree lookup once the
    Notices/Users collections grow past a few thousand documents.
    """
    await users_collection.create_index("email", unique=True)
    await notices_collection.create_index([("department", 1), ("category", 1)])
    await notices_collection.create_index([("title", "text"), ("description", "text")])
    await bookmarks_collection.create_index([("userId", 1), ("noticeId", 1)], unique=True)
    await notifications_collection.create_index([("userId", 1), ("isRead", 1)])
    await roster_students_collection.create_index("srn", unique=True)
    await roster_faculty_collection.create_index("employeeId", unique=True)

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database.db import ensure_indexes
from realtime.manager import socket_app
from routes import (
    auth_routes,
    notice_routes,
    event_routes,
    bookmark_routes,
    notification_routes,
    search_routes,
    chat_routes,
    user_routes,
    club_routes,
    placement_routes,
    analytics_routes,
    roster_routes,
)

load_dotenv()

app = FastAPI(
    title="CampusPulse AI API",
    description="Intelligent college communication & student engagement platform",
    version="1.0.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth_routes, notice_routes, event_routes, bookmark_routes, notification_routes,
          search_routes, chat_routes, user_routes, club_routes, placement_routes, analytics_routes,
          roster_routes):
    app.include_router(r.router)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "CampusPulse AI"}


# Mounted at "/" as a catch-all, but since it's registered AFTER all the
# API routes above, Starlette matches the specific /api/* routes first and
# only falls through to Socket.IO for its own /socket.io/* requests.
# Frontend connects with: io("http://localhost:8000") (default path works).
app.mount("/", socket_app)

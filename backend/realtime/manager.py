"""
Socket.IO server.

Design: each connected client joins a room named after their own userId
(sent as an auth query param on connect). This means "notify this student"
is just `sio.emit(..., room=user_id)` -- no need to track socket ids
ourselves or broadcast-and-filter on the client. Scales fine since
Socket.IO rooms are just a set lookup internally.
"""
import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    user_id = (auth or {}).get("userId")
    if user_id:
        await sio.enter_room(sid, user_id)


@sio.event
async def disconnect(sid):
    pass


async def notify_user(user_id: str, payload: dict):
    """Push a real-time notification to one user's room (all their tabs/devices)."""
    await sio.emit("notification", payload, room=user_id)


async def notify_users(user_ids: list[str], payload: dict):
    for uid in user_ids:
        await notify_user(uid, payload)

"""`/ws` realtime endpoint. Browsers can't set custom headers on a WebSocket
handshake, so the JWT rides as a query param instead of the Authorization
header every REST route uses.
"""

import uuid

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import decode_access_token
from app.models import User
from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    # CORSMiddleware only guards HTTP requests — it never runs for the
    # WebSocket handshake, so the Origin header has to be checked by hand
    # here against the same allowlist REST routes get via settings.cors_origins.
    origin = websocket.headers.get("origin")
    if origin is not None and origin not in settings.cors_origins:
        await websocket.close(code=4003)
        return

    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = decode_access_token(token)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        await websocket.close(code=4001)
        return

    # Team is always derived server-side from the decoded token's user id —
    # never from anything the client supplies — exactly like get_current_user
    # does for every REST route.
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
    finally:
        db.close()

    if user is None or user.team_id is None:
        await websocket.close(code=4001)
        return

    team_id = user.team_id
    await manager.connect(websocket, team_id, user.id)
    try:
        while True:
            # Push-only channel from the server's perspective; any inbound
            # text is ignored. This loop only exists to detect disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket, team_id, user.id)

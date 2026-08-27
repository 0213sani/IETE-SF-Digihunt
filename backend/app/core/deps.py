# SECURITY: never accept `team_id` from request bodies/query params on any
# mutating route. Team membership is always derived from
# `get_current_user(...).team_id` (sourced from the JWT `sub` claim, looked
# up server-side). Every router in later groups must follow this rule.

import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_access_token
from app.models import Team, User
from app.services.round_gate import is_round_unlocked

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError:
        raise unauthorized

    user_id = payload.get("sub")
    if user_id is None:
        raise unauthorized
    try:
        user_id = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise unauthorized

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    return user


def require_role(*roles: str):
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return _check


def require_round_unlocked(round_number: int):
    def _check(
        user: User = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> User:
        if user.team_id is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "no team for this user")
        team = db.get(Team, user.team_id)
        if not is_round_unlocked(db, team, round_number):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, f"Round {round_number} is locked"
            )
        return user

    return _check

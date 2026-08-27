from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models import MasterAttempt, Team, User
from app.services.master_gate import is_master_eligible
from app.services.question_gen import compute_access_key
from app.websocket.manager import broadcast_from_sync

router = APIRouter(prefix="/master", tags=["master"])


def _require_team(user: User = Depends(get_current_user)) -> User:
    if user.team_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no team for this user")
    return user


class MasterStatusOut(BaseModel):
    eligible: bool
    solved: bool


class MasterVerifyIn(BaseModel):
    code: str


class MasterVerifyOut(BaseModel):
    correct: bool
    message: str


def _has_solved(db: Session, team_id) -> bool:
    return (
        db.scalar(
            select(MasterAttempt.id).where(
                MasterAttempt.team_id == team_id, MasterAttempt.correct.is_(True)
            )
        )
        is not None
    )


@router.get("/status", response_model=MasterStatusOut)
def master_status(user: User = Depends(_require_team), db: Session = Depends(get_db)):
    team = db.get(Team, user.team_id)
    return MasterStatusOut(
        eligible=is_master_eligible(db, team), solved=_has_solved(db, team.id)
    )


@router.post("/verify", response_model=MasterVerifyOut)
def verify_master_code(
    payload: MasterVerifyIn,
    user: User = Depends(_require_team),
    db: Session = Depends(get_db),
):
    team = db.get(Team, user.team_id)
    if not is_master_eligible(db, team):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "SYSTEM NOT READY")

    # The team's own Round 1 access key IS the master code now — no separate
    # admin-issued secret. Access keys aren't secrets requiring hashing:
    # they're already visible to the team once earned, so a plain string
    # compare is correct and simpler than inventing a hash step for
    # something the team already legitimately possesses.
    real_key = compute_access_key(db, team)
    correct = real_key is not None and payload.code == real_key

    db.add(MasterAttempt(team_id=team.id, user_id=user.id, correct=correct))
    db.commit()

    if not correct:
        return MasterVerifyOut(correct=False, message="ACCESS DENIED — INVALID ACCESS KEY")

    broadcast_from_sync(team.id, {"type": "master_terminal_unlocked"})
    return MasterVerifyOut(correct=True, message="ACCESS GRANTED — Round 3 unlocked")

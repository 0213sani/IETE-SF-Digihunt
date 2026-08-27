from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Team

MAX_ATTEMPTS = 5


def generate_team_code(db: Session) -> str:
    """Generate a unique team code like DGH-042.

    ponytail: plain count-and-retry loop, not SELECT...FOR UPDATE — good
    enough for registration (not a hot path); upgrade if concurrent
    registrations start colliding often enough to matter.
    """
    count = db.scalar(select(func.count()).select_from(Team)) or 0
    for i in range(MAX_ATTEMPTS):
        candidate = f"DGH-{count + 1 + i:03d}"
        exists = db.scalar(select(Team.id).where(Team.team_code == candidate))
        if not exists:
            return candidate
    raise RuntimeError("could not generate a unique team code")

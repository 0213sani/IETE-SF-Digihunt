from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import require_round_unlocked
from app.models import Team, User
from app.schemas.case import CaseOut
from app.services.case_gen import assign_case

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/me", response_model=CaseOut)
def get_my_case(
    user: User = Depends(require_round_unlocked(3)), db: Session = Depends(get_db)
):
    team = db.get(Team, user.team_id)
    case = assign_case(db, team)
    return CaseOut(
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        evidence=case.evidence,
    )

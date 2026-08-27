import uuid

from pydantic import BaseModel


class MemberOut(BaseModel):
    id: uuid.UUID
    name: str
    is_you: bool


class RoundProgress(BaseModel):
    solved: int
    total: int
    locked: bool


class MasterProgress(BaseModel):
    locked: bool
    solved: bool


class RoundsOut(BaseModel):
    round1: RoundProgress
    round2: RoundProgress
    round3: RoundProgress
    master: MasterProgress


class TeamMeOut(BaseModel):
    team_code: str
    team_name: str
    members: list[MemberOut]
    rounds: RoundsOut

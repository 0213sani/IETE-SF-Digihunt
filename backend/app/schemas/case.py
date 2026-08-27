from pydantic import BaseModel


class CaseOut(BaseModel):
    case_number: int
    title: str
    description: str
    evidence: list | dict | None

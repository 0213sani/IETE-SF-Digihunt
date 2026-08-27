import uuid
from datetime import datetime

from pydantic import BaseModel


class SubmissionOut(BaseModel):
    id: uuid.UUID
    file_name: str
    file_size: int
    mime_type: str
    version: int
    is_current: bool
    submitted_at: datetime

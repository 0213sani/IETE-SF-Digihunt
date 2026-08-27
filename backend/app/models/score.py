import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Score(Base):
    """total is computed on save (see app.services — set total = sum of the
    five criteria before commit; not a DB-computed column)."""

    __tablename__ = "scores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id")
    )
    judge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    problem_understanding: Mapped[int] = mapped_column(Integer)
    technical_solution: Mapped[int] = mapped_column(Integer)
    creativity: Mapped[int] = mapped_column(Integer)
    presentation: Mapped[int] = mapped_column(Integer)
    feasibility: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    finalized: Mapped[bool] = mapped_column(Boolean, default=False)
    finalized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

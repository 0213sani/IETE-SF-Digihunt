import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    round: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String)
    difficulty: Mapped[str] = mapped_column(String)
    question_type: Mapped[str] = mapped_column(String)
    question_text: Mapped[str] = mapped_column(Text)
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(String)
    code_fragment: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class QuestionTemplate(Base):
    __tablename__ = "question_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category: Mapped[str] = mapped_column(String)
    template: Mapped[str] = mapped_column(Text)
    parameters: Mapped[dict] = mapped_column(JSON)
    difficulty: Mapped[str] = mapped_column(String)
    generator_type: Mapped[str] = mapped_column(String)

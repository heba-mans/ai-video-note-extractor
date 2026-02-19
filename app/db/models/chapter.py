from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    idx: Mapped[int] = mapped_column(Integer, nullable=False)

    start_seconds: Mapped[float] = mapped_column(nullable=False)
    end_seconds: Mapped[float] = mapped_column(nullable=False)

    title: Mapped[str] = mapped_column(Text, nullable=False)
    bullets_md: Mapped[str] = mapped_column(Text, nullable=False, default="")

    __table_args__ = (UniqueConstraint("job_id", "idx", name="uq_chapters_job_idx"),)
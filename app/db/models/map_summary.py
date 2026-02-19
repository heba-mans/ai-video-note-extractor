from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MapSummary(Base):
    __tablename__ = "map_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    idx: Mapped[int] = mapped_column(Integer, nullable=False)

    start_seconds: Mapped[float] = mapped_column(nullable=False)
    end_seconds: Mapped[float] = mapped_column(nullable=False)

    summary_md: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (UniqueConstraint("job_id", "idx", name="uq_map_summaries_job_idx"),)
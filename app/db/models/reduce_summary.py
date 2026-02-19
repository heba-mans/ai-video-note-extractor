from __future__ import annotations

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReduceSummary(Base):
    __tablename__ = "reduce_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)

    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    summary_md: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (UniqueConstraint("job_id", name="uq_reduce_summaries_job_id"),)
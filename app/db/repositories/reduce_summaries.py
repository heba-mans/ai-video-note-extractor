from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.reduce_summary import ReduceSummary


def upsert_reduce_summary(db: Session, job_id, *, summary_md: str) -> None:
    row = db.query(ReduceSummary).filter(ReduceSummary.job_id == job_id).one_or_none()
    if row is None:
        db.add(ReduceSummary(job_id=job_id, summary_md=summary_md))
    else:
        row.summary_md = summary_md
    db.flush()
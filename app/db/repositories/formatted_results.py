from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.formatted_result import FormattedResult


def upsert_formatted_result(db: Session, job_id, *, markdown: str) -> None:
    row = db.query(FormattedResult).filter(FormattedResult.job_id == job_id).one_or_none()
    if row is None:
        db.add(FormattedResult(job_id=job_id, markdown=markdown))
    else:
        row.markdown = markdown
    db.flush()
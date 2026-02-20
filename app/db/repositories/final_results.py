from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import Session

from app.db.models.final_result import FinalResult


def upsert_final_result(db: Session, job_id, *, payload_json: dict) -> None:
    row = db.query(FinalResult).filter(FinalResult.job_id == job_id).one_or_none()
    now = datetime.utcnow()

    if row is None:
        db.add(FinalResult(job_id=job_id, payload_json=payload_json, created_at=now, updated_at=now))
    else:
        row.payload_json = payload_json
        row.updated_at = now

    db.flush()
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.job_event import JobEvent


def create_job_event(
    db: Session,
    *,
    job_id,
    type: str,
    message: str | None = None,
    from_status: str | None = None,
    to_status: str | None = None,
    meta: dict[str, Any] | None = None,
) -> JobEvent:
    evt = JobEvent(
        job_id=job_id,
        type=type,
        message=message,
        from_status=from_status,
        to_status=to_status,
        meta=meta,
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)
    return evt


def list_job_events(db: Session, job_id, limit: int = 100) -> list[JobEvent]:
    return (
        db.query(JobEvent)
        .filter(JobEvent.job_id == job_id)
        .order_by(JobEvent.id.asc())
        .limit(limit)
        .all()
    )
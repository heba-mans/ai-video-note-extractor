from typing import Any

from sqlalchemy.orm import Session

from app.db.models.job import Job
from app.db.models.job_event import JobEventType
from app.db.repositories.job_events import create_job_event


def log_job_created(db: Session, job: Job) -> None:
    create_job_event(
        db,
        job_id=job.id,
        type=JobEventType.INFO.value,
        message="Job created",
        meta={"status": job.status, "video_id": str(job.video_id)},
    )


def log_status_change(db: Session, job: Job, from_status: str, to_status: str, stage: str | None = None) -> None:
    meta: dict[str, Any] = {}
    if stage:
        meta["stage"] = stage

    create_job_event(
        db,
        job_id=job.id,
        type=JobEventType.STATUS_CHANGE.value,
        from_status=from_status,
        to_status=to_status,
        message="Status changed",
        meta=meta or None,
    )


def log_error(db: Session, job: Job, message: str, meta: dict[str, Any] | None = None) -> None:
    create_job_event(
        db,
        job_id=job.id,
        type=JobEventType.ERROR.value,
        message=message,
        meta=meta,
    )

def log_retry(db, job, message: str, meta: dict | None = None) -> None:
    create_job_event(
        db,
        job_id=job.id,
        type=JobEventType.RETRY.value,
        message=message,
        meta=meta,
    )
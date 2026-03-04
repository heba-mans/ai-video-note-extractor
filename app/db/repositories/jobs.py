from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db.models.job import Job, JobStatus


def create_job(
    db: Session,
    user_id,
    video_id,
    idempotency_key: str,
    params_json: dict | None = None,
) -> Job:
    job = Job(
        user_id=user_id,
        video_id=video_id,
        idempotency_key=idempotency_key,
        params_json=params_json,
        status=JobStatus.QUEUED.value,
        progress=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id) -> Job | None:
    return (
        db.query(Job)
        .options(joinedload(Job.video))
        .filter(Job.id == job_id)
        .one_or_none()
    )


def get_job_by_idempotency_key(db: Session, user_id, idempotency_key: str) -> Job | None:
    return (
        db.query(Job)
        .options(joinedload(Job.video))
        .filter(Job.user_id == user_id, Job.idempotency_key == idempotency_key)
        .one_or_none()
    )


def create_job_safe(db: Session, job: Job) -> Job:
    """
    Create a job safely under concurrency.
    If the unique constraint is violated, return the existing row.
    """
    try:
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    except IntegrityError:
        db.rollback()
        existing = get_job_by_idempotency_key(db, job.user_id, job.idempotency_key)
        if existing is None:
            raise
        return existing


def list_jobs_for_user(db: Session, user_id, limit: int = 50, offset: int = 0) -> list[Job]:
    return (
        db.query(Job)
        .options(joinedload(Job.video))
        .filter(Job.user_id == user_id)
        .order_by(desc(Job.requested_at))
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_jobs_for_user(db: Session, user_id) -> int:
    return db.query(Job).filter(Job.user_id == user_id).count()


def update_job_fields(db: Session, job: Job, **fields: Any) -> Job:
    """
    Update a job with given fields and commit.

    Cancel safety:
    - If job is already CANCELED, do NOT allow overwriting status away from CANCELED.
    - Also block stage/progress updates once canceled.
    """
    if (job.status or "").upper() == JobStatus.CANCELED.value:
        if "status" in fields and (fields["status"] or "").upper() != JobStatus.CANCELED.value:
            fields.pop("status", None)
        fields.pop("stage", None)
        fields.pop("progress", None)

    for k, v in fields.items():
        setattr(job, k, v)

    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job: Job) -> None:
    """
    Delete a job row. If your DB schema uses cascading foreign keys, dependent rows
    will be removed automatically. Otherwise this may raise an IntegrityError and
    the caller should handle/translate it.
    """
    db.delete(job)
    db.commit()


def get_job_for_update(db: Session, job_id) -> Job | None:
    return db.query(Job).filter(Job.id == job_id).with_for_update().one_or_none()


def now_utc() -> datetime:
    return datetime.utcnow()
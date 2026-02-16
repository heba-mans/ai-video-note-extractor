from sqlalchemy.orm import Session

from app.db.models.job import Job, JobStatus
from sqlalchemy.exc import IntegrityError

from app.db.models.job import Job

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
    return db.query(Job).filter(Job.id == job_id).one_or_none()

def get_job_by_idempotency_key(db: Session, user_id, idempotency_key: str) -> Job | None:
    return (
        db.query(Job)
        .filter(Job.user_id == user_id, Job.idempotency_key == idempotency_key)
        .one_or_none()
    )


def create_job_safe(db: Session, job: Job) -> Job:
    """
    Create a job safely under concurrency.
    If unique constraint is violated, return the existing row.
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
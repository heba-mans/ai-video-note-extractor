from sqlalchemy.orm import Session

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
    return db.query(Job).filter(Job.id == job_id).one_or_none()
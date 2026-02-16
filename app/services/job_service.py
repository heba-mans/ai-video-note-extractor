from sqlalchemy.orm import Session

from app.db.models.job import Job, JobStatus
from app.db.models.video import Video
from app.db.repositories.jobs import create_job_safe, get_job_by_idempotency_key
from app.db.repositories.videos import get_video_by_fingerprint
from app.services.idempotency import build_job_idempotency_key
from app.services.job_events_service import log_job_created
from app.services.youtube_service import (
    canonical_youtube_url,
    extract_youtube_video_id,
    youtube_fingerprint,
)


def get_or_create_video(db: Session, youtube_url: str) -> Video:
    video_id = extract_youtube_video_id(youtube_url)
    fp = youtube_fingerprint(video_id)

    existing = get_video_by_fingerprint(db, fp)
    if existing:
        return existing

    video = Video(
        source="YOUTUBE",
        source_video_id=video_id,
        canonical_url=canonical_youtube_url(video_id),
        fingerprint=fp,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


def create_or_get_job_for_youtube(
    db: Session,
    *,
    user_id,
    youtube_url: str,
    params: dict | None = None,
) -> Job:
    """
    Idempotent job creation:
    - Dedupe video globally by fingerprint
    - Dedupe job per user by (user_id + idempotency_key)
    - Log job creation once (audit trail)
    """
    video = get_or_create_video(db, youtube_url)

    idempotency_key = build_job_idempotency_key(video.fingerprint, params)

    # Fast path: already exists
    existing = get_job_by_idempotency_key(db, user_id, idempotency_key)
    if existing:
        return existing

    job = Job(
        user_id=user_id,
        video_id=video.id,
        idempotency_key=idempotency_key,
        params_json=params,
        status=JobStatus.QUEUED.value,
        progress=0,
    )

    # Safe under concurrency:
    # - If we win the race, it returns the newly created job
    # - If we lose, it returns the existing job
    created = create_job_safe(db, job)

    # Log event only when this call actually created the record.
    # If we lost the race, don't write duplicate "Job created" event.
    if created.id == job.id:
        log_job_created(db, created)

    return created
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.job import Job
from app.services.job_events_service import log_status_change
from app.db.repositories.jobs import update_job_fields


def set_job_progress(
    db: Session,
    *,
    job: Job,
    status: str,
    stage: str | None,
    progress: int | None,
) -> Job:
    """
    Update job status/stage/progress safely:
    - clamps progress to 0..100
    - avoids writing if nothing changed
    - logs STATUS_CHANGE event when status changes
    """
    if progress is not None:
        progress = max(0, min(100, int(progress)))

    changed_status = status != job.status
    changed_stage = stage != job.stage
    changed_progress = progress != job.progress

    if not (changed_status or changed_stage or changed_progress):
        return job  # no-op

    old_status = job.status

    job = update_job_fields(
        db,
        job,
        status=status,
        stage=stage,
        progress=progress,
    )

    # Only log "status change" event if status actually changed
    if changed_status:
        log_status_change(db, job, from_status=old_status, to_status=status, stage=stage)

    return job
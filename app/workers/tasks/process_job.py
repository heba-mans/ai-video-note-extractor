from __future__ import annotations

import traceback
from datetime import datetime
from uuid import UUID

from celery import shared_task
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.db.models.job import JobStatus
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.services.job_events_service import log_error, log_status_change
from app.db.models.job import Job
from app.services.job_events_service import log_retry
from app.services.job_progress_service import set_job_progress
from app.services.job_progress import PROGRESS_STEPS
from app.workers.tasks.download_audio import download_audio

logger = get_logger()


def _utcnow() -> datetime:
    return datetime.utcnow()


def _set_status(db: Session, job, to_status: str, stage: str | None, progress: int | None) -> None:
    from_status = job.status
    update_job_fields(
        db,
        job,
        status=to_status,
        stage=stage,
        progress=progress,
    )
    log_status_change(db, job, from_status=from_status, to_status=to_status, stage=stage)


@shared_task(bind=True, max_retries=3)
def process_job(self, job_id: str) -> dict[str, str]:
    """
    Worker pipeline skeleton:
    - Claim job if QUEUED
    - Simulate stage transitions with progress updates
    - Mark COMPLETED or FAILED
    """
    logger.info("job.process.start", job_id=job_id, task_id=self.request.id)
    attempt = int(getattr(self.request, "retries", 0))

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)

        # Lock job row for update to avoid concurrent workers stepping on each other
        job = get_job_for_update(db, job_uuid)
        if job is None:
            logger.warning("job.process.not_found", job_id=job_id)
            return {"status": "not_found"}

        # Idempotency guard: only process jobs that are still QUEUED
        if job.status != JobStatus.QUEUED.value:
            logger.info("job.process.skip", job_id=job_id, status=job.status)
            return {"status": "skipped", "job_status": job.status}
        
                # TEST HOOK: simulate transient failure when params_json has {"fail_once": true}
        if job.params_json and job.params_json.get("fail_once") and attempt == 0:
            raise RuntimeError("Simulated transient failure (fail_once)")

        # Claim start
        update_job_fields(db, job, started_at=_utcnow(), progress=0)

        step = PROGRESS_STEPS["download_audio"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        download_audio(str(job.id))

        step = PROGRESS_STEPS["download_audio"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        download_audio(str(job.id))

        step = PROGRESS_STEPS["transcribe"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        download_audio(str(job.id))

        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        download_audio(str(job.id))

        step = PROGRESS_STEPS["finalize"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        update_job_fields(db, job, completed_at=_utcnow())

        logger.info("job.process.completed", job_id=job_id)
        return {"status": "completed"}

    except Exception as e:
        trace = traceback.format_exc()
        logger.exception("job.process.failed", job_id=job_id)

        # IMPORTANT: reset transaction after failure
        db.rollback()

        # Determine retry attempt info
        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries

        # Load job (no FOR UPDATE needed here)
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job is not None:
            new_retry_count = (job.retry_count or 0) + 1

            update_job_fields(
                db,
                job,
                error_code=type(e).__name__,
                error_message=str(e),
                error_trace=trace,
                retry_count=new_retry_count,
            )

            if is_last_attempt:
                # Final failure: mark FAILED
                update_job_fields(
                    db,
                    job,
                    status=JobStatus.FAILED.value,
                    stage="failed",
                    completed_at=_utcnow(),
                )
                log_error(
                    db,
                    job,
                    message="Job failed after retries exhausted",
                    meta={"error": str(e), "attempt": attempt, "max_retries": max_retries},
                )
            else:
                # Not last attempt: record retry event
                log_retry(
                    db,
                    job,
                    message="Retrying job after failure",
                    meta={"error": str(e), "attempt": attempt + 1, "max_retries": max_retries},
                )

        # Retry only if not last attempt
        if not is_last_attempt:
            # Exponential backoff: 1s, 2s, 4s...
            countdown = 2**attempt
            raise self.retry(exc=e, countdown=countdown)

        # No more retries: re-raise to mark task as failed in Celery too
        raise
        # Mark FAILED and store error details
        trace = traceback.format_exc()
        logger.exception("job.process.failed", job_id=job_id)
        db.rollback()

        try:
            job = get_job_for_update(db, UUID(job_id))
            if job is not None:
                # Update retry_count (Celery retries will re-run this task)
                new_retry_count = (job.retry_count or 0) + 1
                update_job_fields(
                    db,
                    job,
                    status=JobStatus.FAILED.value,
                    stage="failed",
                    error_code=type(e).__name__,
                    error_message=str(e),
                    error_trace=trace,
                    retry_count=new_retry_count,
                    completed_at=_utcnow(),
                )
                log_error(db, job, message="Job failed", meta={"error": str(e), "retry_count": new_retry_count})
        finally:
            db.close()

        raise

    finally:
        try:
            db.close()
        except Exception:
            pass
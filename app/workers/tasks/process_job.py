from __future__ import annotations

import traceback
from datetime import datetime
from uuid import UUID

from celery import shared_task
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.session import SessionLocal
from app.services.job_events_service import log_error, log_retry
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress
from app.workers.tasks.download_audio import download_audio

logger = get_logger()


def _utcnow() -> datetime:
    return datetime.utcnow()


@shared_task(bind=True, max_retries=3)
def process_job(self, job_id: str) -> dict[str, str]:
    """
    Worker pipeline skeleton:
    - Claim job if QUEUED
    - Download audio (TRANS-1/2)
    - Placeholder steps for transcribe/summarize (TRANS-3+, SUM)
    - Mark COMPLETED or FAILED with retries
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

        # TEST HOOK: simulate transient failure on first attempt
        if job.params_json and job.params_json.get("fail_once") and attempt == 0:
            raise RuntimeError("Simulated transient failure (fail_once)")

        # Mark started
        update_job_fields(db, job, started_at=_utcnow(), progress=0)

        # Stage: download audio
        step = PROGRESS_STEPS["download_audio"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        download_audio(str(job.id))  # direct call for now (simple). Later: chain tasks.

        # Stage: transcribe (placeholder for TRANS-3)
        step = PROGRESS_STEPS["transcribe"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        # TODO: transcribe_audio(job_id)

        # Stage: summarize (placeholder for SUM)
        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        # TODO: summarize(job_id)

        # Finalize
        step = PROGRESS_STEPS["finalize"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)
        update_job_fields(db, job, completed_at=_utcnow())

        logger.info("job.process.completed", job_id=job_id)
        return {"status": "completed"}

    except Exception as e:
        trace = traceback.format_exc()
        logger.exception("job.process.failed", job_id=job_id)

        db.rollback()

        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries

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
                log_retry(
                    db,
                    job,
                    message="Retrying job after failure",
                    meta={"error": str(e), "attempt": attempt + 1, "max_retries": max_retries},
                )

        if not is_last_attempt:
            countdown = 2**attempt
            raise self.retry(exc=e, countdown=countdown)

        raise

    finally:
        db.close()
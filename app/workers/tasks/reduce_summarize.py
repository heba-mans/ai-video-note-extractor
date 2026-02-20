from __future__ import annotations

import traceback
from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.repositories.reduce_summaries import upsert_reduce_summary
from app.db.session import SessionLocal
from app.services.job_events_service import log_error
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress
from app.services.llm_client import LLMClient
from app.services.llm_retry_service import is_retryable_llm_error, retry_delay_seconds
from app.services.job_events_service import log_error, log_retry

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def reduce_summarize_job(self, job_id: str) -> dict[str, str]:
    """
    SUM-2 Reduce step:
    - Read all map_summaries for job
    - Combine into one final markdown summary
    - Persist to reduce_summaries
    """
    logger.info("sum.reduce.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        # Keep "summarize" stage; reduce is part of same phase
        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage="summarize_reduce", progress=step.progress)

        rows = (
            db.execute(
                text(
                    """
                    SELECT idx, summary_md
                    FROM map_summaries
                    WHERE job_id = :job_id
                    ORDER BY idx ASC
                    """
                ),
                {"job_id": str(job_uuid)},
            )
            .mappings()
            .all()
        )

        if not rows:
            raise RuntimeError("No map_summaries found; run SUM-1 first")

        # Build combined input
        combined = "\n\n".join([f"### Chunk {r['idx']}\n{r['summary_md']}" for r in rows])

        llm = LLMClient()
        final_md = llm.reduce_summaries(map_summaries_md=combined)
        if not final_md:
            raise RuntimeError("Empty reduce summary")

        upsert_reduce_summary(db, job_uuid, summary_md=final_md)

        db.commit()
        logger.info("sum.reduce.done", job_id=job_id, chunks=len(rows))
        return {"status": "ok", "chunks": str(len(rows))}

    except Exception as e:
        db.rollback()
        logger.exception("sum.reduce.failed", job_id=job_id)

        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries
        retryable = is_retryable_llm_error(e)

        trace = traceback.format_exc()
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
            # Always record error info
            update_job_fields(
                db,
                job,
                error_code=type(e).__name__,
                error_message=str(e),
                error_trace=trace,
                retry_count=(job.retry_count or 0) + 1 if retryable and not is_last_attempt else (job.retry_count or 0),
            )

            if retryable and not is_last_attempt:
                # ✅ Do NOT mark FAILED for retryable errors
                log_retry(
                    db,
                    job,
                    message="Retrying reduce summarization after transient failure",
                    meta={"error": str(e), "attempt": attempt + 1, "max_retries": max_retries},
                )
            else:
                # ✅ Only mark FAILED when non-retryable OR retries exhausted
                update_job_fields(
                    db,
                    job,
                    status=JobStatus.FAILED.value,
                    stage="summarize_failed",
                )
                log_error(db, job, message="Reduce summarization failed", meta={"error": str(e)})

        if retryable and not is_last_attempt:
            raise self.retry(exc=e, countdown=retry_delay_seconds(attempt))

        raise

    finally:
        db.close()
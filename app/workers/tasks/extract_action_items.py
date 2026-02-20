from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.services.llm_client import LLMClient
import traceback
from uuid import UUID

from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import update_job_fields
from app.services.job_events_service import log_error, log_retry
from app.services.llm_retry_service import is_retryable_llm_error, retry_delay_seconds

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def extract_action_items_job(self, job_id: str):
    logger.info("sum.actions.start", job_id=job_id)

    db = SessionLocal()
    try:
        # Load reduce summary
        row = db.execute(
            text("""
                SELECT summary_md
                FROM reduce_summaries
                WHERE job_id = :job_id
                LIMIT 1
            """),
            {"job_id": job_id},
        ).mappings().one_or_none()

        if not row:
            raise RuntimeError("Reduce summary not found; run SUM-2 first")

        llm = LLMClient()
        items = llm.extract_action_items(summary_md=row["summary_md"])

        # Clear existing
        db.execute(text("DELETE FROM action_items WHERE job_id = :job_id"), {"job_id": job_id})

        # Insert
        for idx, item in enumerate(items):
            db.execute(
                text("""
                    INSERT INTO action_items (job_id, idx, content, owner, due_date, status)
                    VALUES (:job_id, :idx, :content, :owner, :due_date, 'open')
                """),
                {
                    "job_id": job_id,
                    "idx": idx,
                    "content": item["content"],
                    "owner": item.get("owner"),
                    "due_date": item.get("due_date"),
                },
            )

        db.commit()
        logger.info("sum.actions.done", job_id=job_id, count=len(items))

    except Exception as e:
        db.rollback()
        logger.exception("sum.actions.failed", job_id=job_id)

        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries
        retryable = is_retryable_llm_error(e)

        trace = traceback.format_exc()
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
            # Always capture error details
            update_job_fields(
                db,
                job,
                error_code=type(e).__name__,
                error_message=str(e),
                error_trace=trace,
            )

            if retryable and not is_last_attempt:
                log_retry(
                    db,
                    job,
                    message="Retrying action item extraction after transient LLM failure",
                    meta={"error": str(e), "attempt": attempt + 1, "max_retries": max_retries},
                )
            else:
                update_job_fields(
                    db,
                    job,
                    status=JobStatus.FAILED.value,
                    stage="summarize_failed",
                )
                log_error(
                    db,
                    job,
                    message="Action item extraction failed",
                    meta={"error": str(e), "attempt": attempt, "max_retries": max_retries},
                )

        if retryable and not is_last_attempt:
            raise self.retry(exc=e, countdown=retry_delay_seconds(attempt))

        raise

    finally:
        db.close()
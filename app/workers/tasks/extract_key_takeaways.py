from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.llm_client import LLMClient
from app.core.logging import get_logger
import traceback
from uuid import UUID

from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import update_job_fields
from app.services.job_events_service import log_error, log_retry
from app.services.llm_retry_service import is_retryable_llm_error, retry_delay_seconds

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def extract_key_takeaways_job(self, job_id: str):
    logger.info("sum.takeaways.start", job_id=job_id)

    db = SessionLocal()

    try:
        # Get final summary
        result = db.execute(
            text("""
                SELECT summary_md
                FROM reduce_summaries
                WHERE job_id = :job_id
            """),
            {"job_id": job_id},
        ).fetchone()

        if not result:
            raise RuntimeError("Reduce summary not found")

        summary_md = result[0]

        llm = LLMClient()

        takeaways = llm.extract_key_takeaways(summary_md=summary_md)

        # Clear old ones
        db.execute(
            text("DELETE FROM key_takeaways WHERE job_id = :job_id"),
            {"job_id": job_id},
        )

        for idx, content in enumerate(takeaways):
            db.execute(
                text("""
                    INSERT INTO key_takeaways (job_id, idx, content)
                    VALUES (:job_id, :idx, :content)
                """),
                {"job_id": job_id, "idx": idx, "content": content},
            )

        db.commit()

        logger.info(
            "sum.takeaways.done",
            job_id=job_id,
            count=len(takeaways),
        )

    except Exception as e:
        db.rollback()
        logger.exception("sum.takeaways.failed", job_id=job_id)

        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries
        retryable = is_retryable_llm_error(e)

        trace = traceback.format_exc()
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
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
                    message="Retrying key takeaways extraction after transient LLM failure",
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
                    message="Key takeaways extraction failed",
                    meta={"error": str(e), "attempt": attempt, "max_retries": max_retries},
                )

        if retryable and not is_last_attempt:
            raise self.retry(exc=e, countdown=retry_delay_seconds(attempt))

        raise

    finally:
        db.close()
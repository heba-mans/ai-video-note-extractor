from __future__ import annotations

from uuid import UUID
from datetime import datetime
from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.repositories.final_results import upsert_final_result
from app.db.session import SessionLocal
import traceback
from uuid import UUID

from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import update_job_fields
from app.services.job_events_service import log_error, log_retry
from app.services.llm_retry_service import is_retryable_llm_error, retry_delay_seconds

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def persist_final_results_job(self, job_id: str) -> dict[str, str]:
    logger.info("sum.final.start", job_id=job_id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)

        # reduce summary
        reduce_row = db.execute(
            text("SELECT summary_md FROM reduce_summaries WHERE job_id=:job_id LIMIT 1"),
            {"job_id": str(job_uuid)},
        ).mappings().one_or_none()

        # formatted markdown
        fmt_row = db.execute(
            text("SELECT markdown FROM formatted_results WHERE job_id=:job_id LIMIT 1"),
            {"job_id": str(job_uuid)},
        ).mappings().one_or_none()

        # chapters
        chapters_rows = db.execute(
            text("""
                SELECT idx, start_seconds, end_seconds, title, bullets_md
                FROM chapters
                WHERE job_id=:job_id
                ORDER BY idx
            """),
            {"job_id": str(job_uuid)},
        ).mappings().all()

        # key takeaways
        takeaways_rows = db.execute(
            text("""
                SELECT idx, content
                FROM key_takeaways
                WHERE job_id=:job_id
                ORDER BY idx
            """),
            {"job_id": str(job_uuid)},
        ).mappings().all()

        # action items
        actions_rows = db.execute(
            text("""
                SELECT idx, content, owner, due_date, status
                FROM action_items
                WHERE job_id=:job_id
                ORDER BY idx
            """),
            {"job_id": str(job_uuid)},
        ).mappings().all()

        # 🔥 Convert RowMapping → plain dict
        chapters = [dict(row) for row in chapters_rows]
        takeaways = [dict(row) for row in takeaways_rows]
        actions = [dict(row) for row in actions_rows]

        payload = {
            "job_id": job_id,
            "reduce_summary_md": reduce_row["summary_md"] if reduce_row else None,
            "formatted_markdown": fmt_row["markdown"] if fmt_row else None,
            "chapters": chapters,
            "key_takeaways": takeaways,
            "action_items": actions,
        }

        upsert_final_result(db, job_uuid, payload_json=payload)
        db.commit()

        logger.info("sum.final.done", job_id=job_id)
        return {"status": "ok"}

    except Exception as e:
        db.rollback()
        logger.exception("sum.final.failed", job_id=job_id)

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
                    message="Retrying final results persistence after transient failure",
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
                    message="Final results persistence failed",
                    meta={"error": str(e), "attempt": attempt, "max_retries": max_retries},
                )

        if retryable and not is_last_attempt:
            raise self.retry(exc=e, countdown=retry_delay_seconds(attempt))

        raise

    finally:
        db.close()
from __future__ import annotations

import traceback
from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.models.job import Job, JobStatus
from app.db.repositories.formatted_results import upsert_formatted_result
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.session import SessionLocal
from app.services.job_events_service import log_error
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress
from app.services.markdown_formatting_service import build_final_markdown

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def format_markdown_job(self, job_id: str) -> dict[str, str]:
    """
    SUM-3: Build final markdown document from reduce_summaries.
    """
    logger.info("sum.format.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        # Same overall summarize phase
        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage="summarize_format", progress=step.progress)

        # Fetch reduce summary
        row = db.execute(
            text(
                """
                SELECT summary_md
                FROM reduce_summaries
                WHERE job_id = :job_id
                LIMIT 1
                """
            ),
            {"job_id": str(job_uuid)},
        ).mappings().one_or_none()

        if not row:
            raise RuntimeError("No reduce_summaries found; run SUM-2 first")

        final_md = build_final_markdown(
            job_id=job_id,
            final_summary_md=row["summary_md"],
            include_chunk_summaries=False,
        )

        upsert_formatted_result(db, job_uuid, markdown=final_md)

        db.commit()
        logger.info("sum.format.done", job_id=job_id)
        return {"status": "ok"}

    except Exception as e:
        db.rollback()
        logger.exception("sum.format.failed", job_id=job_id)

        trace = traceback.format_exc()
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
            update_job_fields(
                db,
                job,
                status=JobStatus.FAILED.value,
                stage="summarize_failed",
                error_code=type(e).__name__,
                error_message=str(e),
                error_trace=trace,
            )
            log_error(db, job, message="Markdown formatting failed", meta={"error": str(e)})

        attempt = int(getattr(self.request, "retries", 0))
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
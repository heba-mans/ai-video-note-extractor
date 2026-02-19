from __future__ import annotations

import traceback
from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.models.job import Job, JobStatus
from app.db.repositories.chapters import delete_chapters_for_job, insert_chapters
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.session import SessionLocal
from app.services.chapter_parsing_service import parse_chapters_md
from app.services.job_events_service import log_error
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress
from app.services.llm_client import LLMClient

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def extract_chapters_job(self, job_id: str) -> dict[str, str]:
    logger.info("sum.chapters.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage="summarize_chapters", progress=step.progress)

        # Pull map_summaries in order
        rows = (
            db.execute(
                text(
                    """
                    SELECT idx, start_seconds, end_seconds, summary_md
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

        combined = "\n\n".join(
            [
                f"### Chunk {r['idx']} ({r['start_seconds']:.0f}s-{r['end_seconds']:.0f}s)\n{r['summary_md']}"
                for r in rows
            ]
        )

        llm = LLMClient()
        chapters_md = llm.extract_chapters(map_summaries_md=combined)
        chapters = parse_chapters_md(chapters_md)

        if not chapters:
            raise RuntimeError("Chapter extraction produced no chapters")

        # Persist
        delete_chapters_for_job(db, job_uuid)
        insert_chapters(db, job_uuid, chapters)
        db.commit()

        logger.info("sum.chapters.done", job_id=job_id, chapters=len(chapters))
        return {"status": "ok", "chapters": str(len(chapters))}

    except Exception as e:
        db.rollback()
        logger.exception("sum.chapters.failed", job_id=job_id)

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
            log_error(db, job, message="Chapter extraction failed", meta={"error": str(e)})

        attempt = int(getattr(self.request, "retries", 0))
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
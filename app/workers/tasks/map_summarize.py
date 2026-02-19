from __future__ import annotations

import traceback
from uuid import UUID

from celery import shared_task

from app.core.logging import get_logger
from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.repositories.map_summaries import delete_map_summaries_for_job, upsert_map_summary
from app.db.session import SessionLocal
from app.services.job_events_service import log_error
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress
from app.services.llm_client import LLMClient
from sqlalchemy import text

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def map_summarize_job(self, job_id: str) -> dict[str, str]:
    """
    SUM-1 Map step:
    - Read transcript_chunks
    - Summarize each chunk
    - Persist per-chunk markdown summaries in map_summaries
    """
    logger.info("sum.map.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        # Mark summarizing progress
        step = PROGRESS_STEPS["summarize"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)

        # Load chunks
        chunks = (
            db.execute(
                text(
                    """
                    SELECT idx, start_seconds, end_seconds, text
                    FROM transcript_chunks
                    WHERE job_id = :job_id
                    ORDER BY idx ASC
                    """
                ),
                {"job_id": str(job_uuid)},
            )
            .mappings()
            .all()
        )

        if not chunks:
            raise RuntimeError("No transcript_chunks found; cannot summarize")

        # For idempotency: clear existing map summaries (optional)
        delete_map_summaries_for_job(db, job_uuid)

        llm = LLMClient()

        for c in chunks:
            summary_md = llm.summarize_chunk(chunk_text=c["text"])
            if not summary_md:
                raise RuntimeError(f"Empty summary for chunk idx={c['idx']}")

            upsert_map_summary(
                db,
                job_uuid,
                idx=int(c["idx"]),
                start_seconds=float(c["start_seconds"]),
                end_seconds=float(c["end_seconds"]),
                summary_md=summary_md,
            )

        db.commit()
        logger.info("sum.map.done", job_id=job_id, chunks=len(chunks))
        return {"status": "ok", "chunks": str(len(chunks))}

    except Exception as e:
        db.rollback()
        logger.exception("sum.map.failed", job_id=job_id)

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
            log_error(db, job, message="Map summarization failed", meta={"error": str(e)})

        attempt = int(getattr(self.request, "retries", 0))
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
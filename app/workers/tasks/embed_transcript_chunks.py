from __future__ import annotations

import traceback
from uuid import UUID

from celery import shared_task

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.db.models.job import Job, JobStatus
from app.db.repositories.jobs import update_job_fields
from app.db.repositories.transcript_chunk_embeddings import list_chunks_for_job, set_chunk_embedding
from app.services.embeddings_client import EmbeddingsClient

logger = get_logger()


@shared_task(bind=True, max_retries=3)
def embed_transcript_chunks(self, job_id: str) -> dict[str, str]:
    logger.info("rag.embed.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)

        chunks = list_chunks_for_job(db, job_uuid)
        if not chunks:
            raise RuntimeError("No transcript_chunks found to embed")

        client = EmbeddingsClient()

        updated = 0
        for c in chunks:
            # skip if already embedded
            if getattr(c, "embedding", None):
                continue
            emb = client.embed(c.text)
            set_chunk_embedding(db, c.id, emb)
            updated += 1

        db.commit()
        logger.info("rag.embed.done", job_id=job_id, updated=updated, total=len(chunks))
        return {"status": "ok", "updated": str(updated), "total": str(len(chunks))}

    except Exception as e:
        db.rollback()
        logger.exception("rag.embed.failed", job_id=job_id)

        # optional: mark job failed (up to you). For now, just store error.
        trace = traceback.format_exc()
        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
            update_job_fields(
                db,
                job,
                status=JobStatus.FAILED.value,
                stage="embed_failed",
                error_code=type(e).__name__,
                error_message=str(e),
                error_trace=trace,
            )
            db.commit()

        attempt = int(getattr(self.request, "retries", 0))
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.services.llm_client import LLMClient

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
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
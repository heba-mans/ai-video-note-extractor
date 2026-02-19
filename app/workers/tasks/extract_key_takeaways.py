from uuid import UUID

from celery import shared_task
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.llm_client import LLMClient
from app.core.logging import get_logger

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
        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
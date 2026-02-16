from __future__ import annotations

import time

from celery import shared_task

from app.core.logging import get_logger

logger = get_logger()


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def ping(self) -> dict[str, str]:
    logger.info("task.ping.start", task_id=self.request.id)
    time.sleep(1)
    logger.info("task.ping.end", task_id=self.request.id)
    return {"status": "ok"}
from __future__ import annotations

from celery import Celery

from app.core.config import settings
from app.core.logging import configure_logging, get_logger

# Configure structured logging in worker too
configure_logging(log_level=settings.log_level)
logger = get_logger()

celery_app = Celery(
    "ai_video_note_extractor",
    broker=settings.redis_url,
    backend=settings.redis_url,  # OK for portfolio; later can use DB backend if desired
    include=["app.workers.tasks.debug", "app.workers.tasks.process_job", "app.workers.tasks.download_audio"],
)

# Celery runtime settings
celery_app.conf.update(
    task_track_started=True,
    task_time_limit=60 * 30,  # hard limit 30 min
    task_soft_time_limit=60 * 25,  # soft limit 25 min
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

logger.info("celery.configured", broker=settings.redis_url)
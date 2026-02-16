import logging
import sys
import uuid

import structlog


def configure_logging(log_level: str = "INFO") -> None:
    """
    Configure structured JSON logging for the application.

    - Uses standard logging + structlog
    - Emits JSON to stdout (Docker-friendly)
    - Supports correlation fields like request_id, job_id
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,  # merge request_id/job_id into events
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,  # include exception stack traces
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def get_logger() -> structlog.stdlib.BoundLogger:
    return structlog.get_logger()


def new_request_id() -> str:
    return str(uuid.uuid4())
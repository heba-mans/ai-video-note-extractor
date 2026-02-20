from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware

from app.api.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)

configure_logging(log_level=getattr(settings, "log_level", "INFO"))
logger = get_logger()

app = FastAPI(
    title="AI Video Note Extractor API",
    description="Backend API for AI-powered video note extraction.",
    version="0.1.0",
)

# Middleware to inject request_id + structured logs
app.add_middleware(RequestContextMiddleware)

# ✅ API-8: Standardized error handling
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Include versioned API routes
app.include_router(api_router, prefix="/api/v1")

# Root-level health endpoint
@app.get("/health", tags=["Health"])
async def root_health_check() -> dict[str, str]:
    logger.info("health.check")
    return {"status": "ok"}
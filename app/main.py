from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware

configure_logging(log_level=getattr(settings, "log_level", "INFO"))
logger = get_logger()

app = FastAPI(
    title="AI Video Note Extractor API",
    description="Backend API for AI-powered video note extraction.",
    version="0.1.0",
)

# Middleware to inject request_id + structured logs
app.add_middleware(RequestContextMiddleware)

# Include versioned API routes
app.include_router(api_router, prefix="/api/v1")

# Root-level health endpoint
@app.get("/health", tags=["Health"])
async def root_health_check() -> dict[str, str]:
    logger.info("health.check")
    return {"status": "ok"}
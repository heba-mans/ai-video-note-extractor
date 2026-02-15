from fastapi import FastAPI

from app.api.v1.router import api_router

app = FastAPI(
    title="AI Video Note Extractor API",
    description="Backend API for AI-powered video note extraction.",
    version="0.1.0",
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def root_health_check() -> dict[str, str]:
    """
    Root-level health endpoint.
    Useful for infrastructure-level health checks.
    """
    return {"status": "ok"}
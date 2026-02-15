from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Used for:
    - Local development checks
    - Docker health checks (later)
    - Load balancer probes (future)
    """
    return {"status": "ok"}
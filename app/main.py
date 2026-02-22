from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from fastapi.middleware.cors import CORSMiddleware

configure_logging(log_level=getattr(settings, "log_level", "INFO"))
logger = get_logger()

app = FastAPI(
    title="AI Video Note Extractor API",
    description="Backend API for AI-powered video note extraction.",
    version="0.1.0",
)

app.add_middleware(RequestContextMiddleware)
app.include_router(api_router, prefix="/api/v1")


# ✅ Handle HTTPException (404, 409, etc.)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    request_id = getattr(request.state, "request_id", None)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.detail if isinstance(exc.detail, str) else "error",
                "message": exc.detail,
                "request_id": request_id,
            }
        },
    )


# ✅ Handle FastAPI validation errors (invalid UUID, bad params)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "bad_request",
                "message": "Invalid request parameters",
                "request_id": request_id,
            }
        },
    )


# ✅ Catch-all fallback
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("unhandled.error", request_id=request_id)

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "Internal server error",
                "request_id": request_id,
            }
        },
    )


@app.get("/health", tags=["Health"])
async def root_health_check():
    logger.info("health.check")
    return {"status": "ok"}

app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
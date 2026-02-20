from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger()


def _get_request_id(request: Request) -> str | None:
    # Try state first
    request_id = getattr(request.state, "request_id", None)

    # Fallback to header if needed
    if not request_id:
        request_id = request.headers.get("x-request-id")

    return request_id


async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = _get_request_id(request)

    logger.warning(
        "api.http_error",
        path=str(request.url),
        status_code=exc.status_code,
        detail=exc.detail,
        request_id=request_id,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.detail if isinstance(exc.detail, str) else "http_error",
                "message": exc.detail,
                "request_id": request_id,
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = _get_request_id(request)

    logger.warning(
        "api.validation_error",
        path=str(request.url),
        errors=exc.errors(),
        request_id=request_id,
    )

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "bad_request",
                "message": "Invalid request",
                "details": exc.errors(),
                "request_id": request_id,
            }
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = _get_request_id(request)

    logger.exception(
        "api.unhandled_error",
        path=str(request.url),
        request_id=request_id,
    )

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
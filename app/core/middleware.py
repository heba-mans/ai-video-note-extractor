from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

import structlog
from structlog import contextvars

from app.core.logging import new_request_id


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Adds request_id to every request and binds it into structlog contextvars.
    Also returns it in response headers for debugging.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or new_request_id()

        # Bind to structlog context (available in all logs during this request)
        contextvars.bind_contextvars(request_id=request_id)

        logger = structlog.get_logger()
        logger.info("request.start", method=request.method, path=request.url.path)

        try:
            response = await call_next(request)
        except Exception:
            logger.exception("request.error")
            raise
        finally:
            # Clear context so it doesn’t leak between requests
            contextvars.clear_contextvars()

        response.headers["X-Request-ID"] = request_id
        logger.info("request.end", status_code=response.status_code)
        return response
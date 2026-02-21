from __future__ import annotations

import time

import redis
from fastapi import HTTPException

from app.core.config import settings

# uses the same Redis as Celery broker
_redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _key(scope: str, identity: str) -> str:
    # identity can be user_id or ip
    return f"rl:{scope}:{identity}"


def rate_limit_or_429(scope: str, identity: str, *, limit: int, window_seconds: int = 60) -> None:
    """
    Fixed window counter with TTL.
    - increment counter
    - set expiry on first hit
    - if over limit -> 429
    """
    if not settings.rate_limit_enabled:
        return

    k = _key(scope, identity)
    count = _redis.incr(k)

    if count == 1:
        _redis.expire(k, window_seconds)

    if count > limit:
        ttl = _redis.ttl(k)
        retry_after = ttl if ttl and ttl > 0 else window_seconds

        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after}s",
            headers={"Retry-After": str(retry_after)},
        )
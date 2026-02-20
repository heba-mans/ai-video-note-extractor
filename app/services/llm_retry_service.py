from __future__ import annotations

import random


def is_retryable_llm_error(e: Exception) -> bool:
    """
    Conservative retry policy:
    - retry on rate limits, timeouts, transient server errors
    - do NOT retry on auth/invalid request (unless you explicitly want to)
    """
    msg = str(e).lower()

    # common retryable signals
    retry_signals = [
        "rate limit",
        "too many requests",
        "timeout",
        "temporarily",
        "service unavailable",
        "bad gateway",
        "gateway timeout",
        "connection reset",
        "connection error",
        "server error",
        "503",
        "502",
        "504",
        "429",
    ]
    if any(s in msg for s in retry_signals):
        return True

    # json parse errors are retryable if your model is supposed to output json
    if "json" in msg and ("decode" in msg or "parse" in msg):
        return True

    return False


def retry_delay_seconds(attempt: int) -> int:
    """
    Exponential backoff with jitter.
    attempt is 0-based retry count.
    """
    base = 2 ** attempt
    jitter = random.randint(0, 2)
    return min(60, base + jitter)
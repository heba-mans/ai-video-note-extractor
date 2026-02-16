import hashlib
import json
from typing import Any


def canonicalize_params(params: dict[str, Any] | None) -> str:
    """
    Convert params to a deterministic string so hashing is stable.
    """
    if not params:
        return "{}"
    return json.dumps(params, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def build_job_idempotency_key(video_fingerprint: str, params: dict[str, Any] | None) -> str:
    """
    Idempotency key must change if params change.
    Example input:
      video_fingerprint = sha256("youtube:<video_id>")
      params = {"language": "en", "whisper_model": "small"}
    """
    raw = f"v1:{video_fingerprint}:{canonicalize_params(params)}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
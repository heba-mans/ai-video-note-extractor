import hashlib
import re
from urllib.parse import parse_qs, urlparse


_YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}


def extract_youtube_video_id(url: str) -> str:
    """
    Extract YouTube video ID from common URL formats.

    Supported:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/shorts/VIDEO_ID
    """
    parsed = urlparse(url.strip())

    host = parsed.netloc.lower()
    if host not in _YOUTUBE_HOSTS and not host.endswith("youtube.com"):
        raise ValueError("Unsupported YouTube URL host")

    # youtu.be/<id>
    if host == "youtu.be":
        video_id = parsed.path.lstrip("/").split("/")[0]
        if video_id:
            return _validate_video_id(video_id)

    # youtube.com/watch?v=<id>
    if parsed.path == "/watch":
        qs = parse_qs(parsed.query)
        video_id = (qs.get("v") or [None])[0]
        if video_id:
            return _validate_video_id(video_id)

    # youtube.com/embed/<id>
    m = re.match(r"^/embed/([^/?#]+)", parsed.path)
    if m:
        return _validate_video_id(m.group(1))

    # youtube.com/shorts/<id>
    m = re.match(r"^/shorts/([^/?#]+)", parsed.path)
    if m:
        return _validate_video_id(m.group(1))

    raise ValueError("Could not extract video id from URL")


def youtube_fingerprint(video_id: str) -> str:
    """
    Stable fingerprint for idempotency/deduplication.
    """
    raw = f"youtube:{video_id}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def canonical_youtube_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def _validate_video_id(video_id: str) -> str:
    """
    YouTube video IDs are typically 11 characters of [A-Za-z0-9_-]
    We'll enforce a conservative validation to avoid garbage input.
    """
    if not re.match(r"^[A-Za-z0-9_-]{6,20}$", video_id):
        raise ValueError("Invalid YouTube video id format")
    return video_id
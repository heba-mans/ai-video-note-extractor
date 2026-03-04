from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from yt_dlp import YoutubeDL

from app.db.models.video import Video
from app.services.youtube_service import canonical_youtube_url, youtube_fingerprint

logger = logging.getLogger(__name__)


def _fetch_youtube_metadata(original_url: str) -> tuple[str | None, str | None, int | None]:
    """
    Best-effort metadata fetch (no download).
    Returns: (title, channel_name, duration_seconds)
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "extract_flat": False,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(original_url, download=False)

    if not isinstance(info, dict):
        return None, None, None

    title = info.get("title")
    if not isinstance(title, str) or not title.strip():
        title = None

    channel = info.get("channel") or info.get("uploader") or info.get("uploader_id")
    if not isinstance(channel, str) or not channel.strip():
        channel = None

    duration = info.get("duration")
    duration_seconds: int | None = None
    if isinstance(duration, (int, float)):
        duration_seconds = int(duration)

    return title, channel, duration_seconds


def get_video_by_fingerprint(db: Session, fingerprint: str) -> Video | None:
    return db.query(Video).filter(Video.fingerprint == fingerprint).one_or_none()


def create_video(
    db: Session,
    source_video_id: str,
    original_url: str,
) -> Video:
    """
    Create a Video row. Best-effort fetch YouTube metadata during creation:
    - title
    - channel_name
    - duration_seconds
    """
    fp = youtube_fingerprint(source_video_id)

    title: str | None = None
    channel_name: str | None = None
    duration_seconds: int | None = None

    try:
        title, channel_name, duration_seconds = _fetch_youtube_metadata(original_url)
    except Exception as e:
        logger.warning("yt-dlp metadata fetch failed; continuing without metadata. err=%s", e)

    video = Video(
        source="YOUTUBE",
        source_video_id=source_video_id,
        canonical_url=canonical_youtube_url(source_video_id),
        fingerprint=fp,
        title=title,
        channel_name=channel_name,
        duration_seconds=duration_seconds,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video
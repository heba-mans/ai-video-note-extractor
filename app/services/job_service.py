from __future__ import annotations

import hashlib
import logging
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session
from yt_dlp import YoutubeDL

from app.db.models.video import Video, VideoSource
from app.db.repositories.jobs import create_job_safe, get_job_by_idempotency_key
from app.db.repositories.videos import get_video_by_fingerprint, create_video

logger = logging.getLogger(__name__)


def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _extract_youtube_id(youtube_url: str) -> str:
    """
    Extract a stable YouTube video id from common URL shapes.
    Falls back to a stable hash prefix if parsing fails.
    """
    try:
        if "youtube.com" in youtube_url and "v=" in youtube_url:
            part = youtube_url.split("v=", 1)[1]
            vid = part.split("&", 1)[0].strip()
            if vid:
                return vid

        if "youtu.be/" in youtube_url:
            part = youtube_url.split("youtu.be/", 1)[1]
            vid = part.split("?", 1)[0].split("&", 1)[0].strip()
            if vid:
                return vid
    except Exception:
        pass

    return _sha256(youtube_url)[:32]


def _fetch_youtube_metadata(youtube_url: str) -> dict[str, Any]:
    """
    Use yt-dlp to fetch metadata only (no download).
    Returns: title, channel_name, duration_seconds, canonical_url, source_video_id
    Raises on failure; caller should catch.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "noplaylist": True,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)

    title = info.get("title") if isinstance(info, dict) else None
    duration = info.get("duration") if isinstance(info, dict) else None

    channel = None
    if isinstance(info, dict):
        channel = info.get("channel") or info.get("uploader") or info.get("uploader_id")

    canonical = None
    if isinstance(info, dict):
        canonical = info.get("webpage_url") or info.get("original_url") or youtube_url

    source_video_id = None
    if isinstance(info, dict):
        source_video_id = info.get("id")
    if not source_video_id:
        source_video_id = _extract_youtube_id(youtube_url)

    return {
        "title": title if isinstance(title, str) and title.strip() else None,
        "channel_name": channel if isinstance(channel, str) and channel.strip() else None,
        "duration_seconds": int(duration) if isinstance(duration, (int, float)) else None,
        "canonical_url": canonical if isinstance(canonical, str) and canonical.strip() else youtube_url,
        "source_video_id": str(source_video_id),
    }


def get_or_create_video(db: Session, youtube_url: str) -> Video:
    """
    Create or fetch Video row using fingerprint.
    Best-effort metadata enrichment:
    - If video exists but title/channel/duration missing -> try fetch and update.
    - If video does not exist -> create it via repositories.videos.create_video(...)
      (which itself fetches metadata during creation).
    """
    source_video_id = _extract_youtube_id(youtube_url)
    fingerprint = _sha256(f"youtube:{source_video_id}")[:64]

    existing = get_video_by_fingerprint(db, fingerprint)
    if existing is not None:
        # Best-effort enrich existing row if metadata missing.
        if not existing.title or not existing.channel_name or existing.duration_seconds is None:
            try:
                meta = _fetch_youtube_metadata(youtube_url)
                changed = False

                if not existing.title and meta.get("title"):
                    existing.title = meta["title"]
                    changed = True
                if not existing.channel_name and meta.get("channel_name"):
                    existing.channel_name = meta["channel_name"]
                    changed = True
                if existing.duration_seconds is None and meta.get("duration_seconds") is not None:
                    existing.duration_seconds = meta["duration_seconds"]
                    changed = True

                # keep canonical_url fresh if blank
                if not getattr(existing, "canonical_url", None) and meta.get("canonical_url"):
                    existing.canonical_url = meta["canonical_url"]
                    changed = True

                if changed:
                    db.add(existing)
                    db.commit()
                    db.refresh(existing)
            except Exception as e:
                logger.warning(
                    "yt-dlp metadata fetch failed (existing video). continuing. err=%s",
                    e,
                )

        return existing

    # New video: create via repository function (IMPORTANT: signature!)
    # repositories.videos.create_video(db, source_video_id, original_url)
    try:
        return create_video(db, source_video_id=source_video_id, original_url=youtube_url)
    except Exception as e:
        # If create_video handles its own metadata fetch and still might fail, bubble it up
        # or decide to fail fast. Here we fail fast for consistency.
        logger.exception("Failed to create video row. err=%s", e)
        raise


def create_or_get_job_for_youtube(
    db: Session,
    user_id: UUID,
    youtube_url: str,
    params: dict[str, Any] | None,
):
    """
    Idempotent: same user + same video + same params => same job.
    """
    video = get_or_create_video(db, youtube_url)

    params_key = _sha256(str(params or {}))[:16]
    idempotency_key = f"youtube:{video.fingerprint}:{params_key}"

    existing = get_job_by_idempotency_key(
        db, user_id=user_id, idempotency_key=idempotency_key
    )
    if existing is not None:
        return existing

    from app.db.models.job import Job

    job = Job(
        user_id=user_id,
        video_id=video.id,
        idempotency_key=idempotency_key,
        params_json=params,
    )

    return create_job_safe(db, job)
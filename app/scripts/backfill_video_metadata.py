from __future__ import annotations

import argparse
import logging
import time
from typing import Any

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker
from yt_dlp import YoutubeDL

from app.core.config import settings
from app.db.models.video import Video

logger = logging.getLogger(__name__)


def fetch_youtube_metadata(url: str) -> dict[str, Any]:
    """
    Best-effort yt-dlp metadata fetch (no download).
    Returns keys: title, channel_name, duration_seconds
    Raises if yt-dlp fails; caller should catch.
    """
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "extract_flat": False,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not isinstance(info, dict):
        return {"title": None, "channel_name": None, "duration_seconds": None}

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

    return {
        "title": title,
        "channel_name": channel,
        "duration_seconds": duration_seconds,
    }


def canonical_url_from_source(video: Video) -> str | None:
    # Prefer canonical_url if present
    url = getattr(video, "canonical_url", None)
    if isinstance(url, str) and url.strip():
        return url.strip()

    # Fallback: reconstruct YouTube canonical URL
    source = getattr(video, "source", None)
    source_video_id = getattr(video, "source_video_id", None)
    if isinstance(source, str) and source.upper() == "YOUTUBE" and isinstance(source_video_id, str) and source_video_id:
        return f"https://www.youtube.com/watch?v={source_video_id}"

    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill YouTube metadata for existing Video rows.")
    parser.add_argument("--limit", type=int, default=200, help="Max number of videos to process in this run.")
    parser.add_argument("--sleep", type=float, default=0.5, help="Seconds to sleep between yt-dlp calls.")
    parser.add_argument("--dry-run", action="store_true", help="Do not write changes to DB.")
    parser.add_argument("--verbose", action="store_true", help="Verbose logging.")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    db_url = settings.database_url
    if not db_url:
        logger.error("DATABASE_URL is not set in settings.")
        return 2

    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    processed = 0
    updated = 0
    failed = 0
    skipped = 0

    with SessionLocal() as db:
        videos: list[Video] = (
            db.query(Video)
            .filter(
                or_(
                    Video.title.is_(None),
                    Video.channel_name.is_(None),
                    Video.duration_seconds.is_(None),
                )
            )
            .order_by(Video.created_at.desc())
            .limit(args.limit)
            .all()
        )

        logger.info("Found %d videos missing metadata (limit=%d).", len(videos), args.limit)

        for v in videos:
            processed += 1

            url = canonical_url_from_source(v)
            if not url:
                skipped += 1
                logger.warning("Skipping video %s: no usable URL (source=%s source_video_id=%s).", v.id, v.source, v.source_video_id)
                continue

            try:
                meta = fetch_youtube_metadata(url)

                new_title = meta.get("title")
                new_channel = meta.get("channel_name")
                new_duration = meta.get("duration_seconds")

                changed = False
                if (not v.title) and isinstance(new_title, str) and new_title.strip():
                    v.title = new_title.strip()
                    changed = True

                if (not v.channel_name) and isinstance(new_channel, str) and new_channel.strip():
                    v.channel_name = new_channel.strip()
                    changed = True

                if v.duration_seconds is None and isinstance(new_duration, int):
                    v.duration_seconds = new_duration
                    changed = True

                if changed:
                    updated += 1
                    logger.info(
                        "Update %s | %s | title=%r channel=%r duration=%r",
                        v.id,
                        url,
                        v.title,
                        v.channel_name,
                        v.duration_seconds,
                    )
                    if not args.dry_run:
                        db.add(v)
                        db.commit()
                else:
                    skipped += 1
                    logger.info("No change %s | %s", v.id, url)

            except Exception as e:
                failed += 1
                logger.warning("Failed %s | %s | %s", v.id, url, e)
                if not args.dry_run:
                    db.rollback()

            if args.sleep > 0:
                time.sleep(args.sleep)

    logger.info(
        "Done. processed=%d updated=%d skipped=%d failed=%d dry_run=%s",
        processed,
        updated,
        skipped,
        failed,
        args.dry_run,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
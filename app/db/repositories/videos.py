from sqlalchemy.orm import Session

from app.db.models.video import Video
from app.services.youtube_service import canonical_youtube_url, youtube_fingerprint


def get_video_by_fingerprint(db: Session, fingerprint: str) -> Video | None:
    return db.query(Video).filter(Video.fingerprint == fingerprint).one_or_none()


def create_video(
    db: Session,
    source_video_id: str,
    original_url: str,
) -> Video:
    fp = youtube_fingerprint(source_video_id)
    video = Video(
        source="YOUTUBE",
        source_video_id=source_video_id,
        canonical_url=canonical_youtube_url(source_video_id),
        fingerprint=fp,
        # You can set title/channel/duration later when we fetch metadata
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video
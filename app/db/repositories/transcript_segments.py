from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models.transcript_segment import TranscriptSegment

from typing import Iterable
from sqlalchemy import func


def replace_segments_for_job(db: Session, job_id, segments: list[dict]) -> int:
    """
    Idempotent persistence:
    - Delete old segments for this job
    - Insert new segments in a single transaction
    segments: [{idx, start_ms, end_ms, text}, ...]
    Returns number inserted.
    """
    # Use a transaction boundary controlled by caller
    db.query(TranscriptSegment).filter(TranscriptSegment.job_id == job_id).delete()

    rows = [
        TranscriptSegment(
            job_id=job_id,
            idx=s["idx"],
            start_ms=s["start_ms"],
            end_ms=s["end_ms"],
            text=s["text"],
        )
        for s in segments
    ]

    db.bulk_save_objects(rows)
    return len(rows)


def list_segments_for_job(db: Session, job_id, limit: int = 200, offset: int = 0) -> list[TranscriptSegment]:
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.job_id == job_id)
        .order_by(TranscriptSegment.idx.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def count_segments_for_job(db: Session, job_id) -> int:
    return db.query(TranscriptSegment).filter(TranscriptSegment.job_id == job_id).count()


def search_segments_for_job(db: Session, job_id, q: str, limit: int = 50, offset: int = 0) -> list[TranscriptSegment]:
    """
    Simple ILIKE search (Phase 1). Later we can add full-text index.
    """
    pattern = f"%{q}%"
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.job_id == job_id)
        .filter(TranscriptSegment.text.ilike(pattern))
        .order_by(TranscriptSegment.idx.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def delete_segments_for_job(db: Session, job_id):
    db.query(TranscriptSegment).filter(
        TranscriptSegment.job_id == job_id
    ).delete()
    db.flush()


def insert_segments(
    db: Session,
    job_id,
    segments: Iterable[dict],
):
    objects = [
        TranscriptSegment(
            job_id=job_id,
            idx=s["idx"],
            start_ms=s["start_ms"],
            end_ms=s["end_ms"],
            text=s["text"],
        )
        for s in segments
    ]

    db.bulk_save_objects(objects)
    db.flush()


def replace_segments_for_job(
    db: Session,
    job_id,
    segments: Iterable[dict],
):
    delete_segments_for_job(db, job_id)
    insert_segments(db, job_id, segments)

def count_segments_for_job(db: Session, job_id) -> int:
    return int(
        db.query(func.count(TranscriptSegment.id))
        .filter(TranscriptSegment.job_id == job_id)
        .scalar()
        or 0
    )


def list_segments_for_job(db: Session, job_id, *, limit: int, offset: int) -> list[TranscriptSegment]:
    return (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.job_id == job_id)
        .order_by(TranscriptSegment.idx.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
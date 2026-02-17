from sqlalchemy.orm import Session

from app.db.models.transcript_segment import TranscriptSegment


def insert_segments(db: Session, job_id, segments: list[dict]) -> None:
    """
    segments: list of {idx, start_ms, end_ms, text}
    """
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
    db.commit()


def delete_segments_for_job(db: Session, job_id) -> None:
    db.query(TranscriptSegment).filter(TranscriptSegment.job_id == job_id).delete()
    db.commit()
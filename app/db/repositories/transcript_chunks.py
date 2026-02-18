from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.transcript_chunk import TranscriptChunk


def delete_chunks_for_job(db: Session, job_id) -> None:
    db.query(TranscriptChunk).filter(TranscriptChunk.job_id == job_id).delete()
    db.flush()


def insert_chunks(db: Session, job_id, chunks: list[dict]) -> None:
    """
    chunks format:
      { "idx": int, "start_seconds": float, "end_seconds": float, "text": str }
    """
    db.bulk_insert_mappings(
        TranscriptChunk,
        [
        {
            "job_id": job_id,
            "idx": c["idx"],
            "start_seconds": c["start_seconds"],
            "end_seconds": c["end_seconds"],
            "text": c["text"],
        }
            for c in chunks
        ],
    )
    db.flush()
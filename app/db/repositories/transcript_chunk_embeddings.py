from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.transcript_chunk import TranscriptChunk


def list_chunks_for_job(db: Session, job_id):
    return (
        db.query(TranscriptChunk)
        .filter(TranscriptChunk.job_id == job_id)
        .order_by(TranscriptChunk.idx.asc())
        .all()
    )


def set_chunk_embedding(db: Session, chunk_id: int, embedding: list[float]) -> None:
    db.query(TranscriptChunk).filter(TranscriptChunk.id == chunk_id).update(
        {"embedding": embedding}
    )
    db.flush()
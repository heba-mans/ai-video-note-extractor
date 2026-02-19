from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.chapter import Chapter


def delete_chapters_for_job(db: Session, job_id) -> None:
    db.query(Chapter).filter(Chapter.job_id == job_id).delete()
    db.flush()


def insert_chapters(db: Session, job_id, chapters: list[dict]) -> None:
    db.bulk_insert_mappings(
        Chapter,
        [
            {
                "job_id": job_id,
                "idx": c["idx"],
                "start_seconds": c["start_seconds"],
                "end_seconds": c["end_seconds"],
                "title": c["title"],
                "bullets_md": c.get("bullets_md", ""),
            }
            for c in chapters
        ],
    )
    db.flush()
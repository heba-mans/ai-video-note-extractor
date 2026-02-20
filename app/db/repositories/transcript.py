from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def count_segments(db: Session, job_id) -> int:
    row = db.execute(
        text("SELECT COUNT(*) AS c FROM transcript_segments WHERE job_id=:job_id"),
        {"job_id": str(job_id)},
    ).mappings().one()
    return int(row["c"])


def fetch_segments_page(db: Session, job_id, *, limit: int, offset: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT idx, start_ms, end_ms, text
            FROM transcript_segments
            WHERE job_id=:job_id
            ORDER BY idx
            LIMIT :limit OFFSET :offset
            """
        ),
        {"job_id": str(job_id), "limit": limit, "offset": offset},
    ).mappings().all()
    return [dict(r) for r in rows]
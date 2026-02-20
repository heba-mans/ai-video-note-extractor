from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def count_search_hits(db: Session, job_id, q: str) -> int:
    row = db.execute(
        text(
            """
            SELECT COUNT(*) AS c
            FROM transcript_segments
            WHERE job_id = :job_id
              AND to_tsvector('english', coalesce(text, '')) @@ plainto_tsquery('english', :q)
            """
        ),
        {"job_id": str(job_id), "q": q},
    ).mappings().one()
    return int(row["c"])


def search_segments(db: Session, job_id, q: str, *, limit: int, offset: int) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT idx, start_ms, end_ms, text,
                   ts_rank(to_tsvector('english', coalesce(text, '')),
                           plainto_tsquery('english', :q)) AS rank
            FROM transcript_segments
            WHERE job_id = :job_id
              AND to_tsvector('english', coalesce(text, '')) @@ plainto_tsquery('english', :q)
            ORDER BY rank DESC, idx ASC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"job_id": str(job_id), "q": q, "limit": limit, "offset": offset},
    ).mappings().all()
    return [dict(r) for r in rows]
from __future__ import annotations

from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.embedding_service import embed_text


def _pgvector_literal(vec: List[float]) -> str:
    # pgvector accepts: '[0.1,0.2,...]'
    return "[" + ",".join(f"{x:.8f}" for x in vec) + "]"


def retrieve_top_k_chunks(
    db: Session,
    *,
    job_id: UUID,
    query: str,
    k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Returns top-k transcript_chunks for a given job, ordered by vector distance.
    Uses cosine distance operator (<=>) by default (works with HNSW index).
    """
    if not query.strip():
        return []

    query_vec = embed_text(query)
    vec_str = _pgvector_literal(query_vec)

    rows = db.execute(
        text(
            """
            SELECT
                id,
                idx,
                start_seconds,
                end_seconds,
                text,
                (embedding <=> :qvec) AS distance
            FROM transcript_chunks
            WHERE job_id = :job_id
              AND embedding IS NOT NULL
            ORDER BY embedding <=> :qvec
            LIMIT :k
            """
        ),
        {"job_id": str(job_id), "qvec": vec_str, "k": int(k)},
    ).mappings().all()

    return [dict(r) for r in rows]
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models.map_summary import MapSummary


def delete_map_summaries_for_job(db: Session, job_id) -> None:
    db.query(MapSummary).filter(MapSummary.job_id == job_id).delete()
    db.flush()


def upsert_map_summary(
    db: Session,
    job_id,
    *,
    idx: int,
    start_seconds: float,
    end_seconds: float,
    summary_md: str,
) -> None:
    row = (
        db.query(MapSummary)
        .filter(MapSummary.job_id == job_id, MapSummary.idx == idx)
        .one_or_none()
    )

    if row is None:
        db.add(
            MapSummary(
                job_id=job_id,
                idx=idx,
                start_seconds=start_seconds,
                end_seconds=end_seconds,
                summary_md=summary_md,
            )
        )
    else:
        row.start_seconds = start_seconds
        row.end_seconds = end_seconds
        row.summary_md = summary_md

    db.flush()
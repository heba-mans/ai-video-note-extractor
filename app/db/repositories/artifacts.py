from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.artifact import Artifact


def get_artifact(db: Session, *, job_id, type: str) -> Artifact | None:
    return (
        db.query(Artifact)
        .filter(Artifact.job_id == job_id, Artifact.type == type)
        .one_or_none()
    )


def upsert_artifact(
    db: Session,
    *,
    job_id,
    type: str,
    storage_uri: str,
    content_sha256: str | None = None,
    size_bytes: int | None = None,
    meta: dict | None = None,
) -> Artifact:
    """
    Idempotent artifact creation:
    - if exists, update fields
    - if not, insert
    - safe under concurrency via unique constraint
    """
    existing = get_artifact(db, job_id=job_id, type=type)
    if existing:
        existing.storage_uri = storage_uri
        existing.content_sha256 = content_sha256
        existing.size_bytes = size_bytes
        existing.meta = meta
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    art = Artifact(
        job_id=job_id,
        type=type,
        storage_uri=storage_uri,
        content_sha256=content_sha256,
        size_bytes=size_bytes,
        meta=meta,
    )
    try:
        db.add(art)
        db.commit()
        db.refresh(art)
        return art
    except IntegrityError:
        db.rollback()
        # Another worker inserted first — fetch and update
        existing = get_artifact(db, job_id=job_id, type=type)
        if not existing:
            raise
        existing.storage_uri = storage_uri
        existing.content_sha256 = content_sha256
        existing.size_bytes = size_bytes
        existing.meta = meta
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
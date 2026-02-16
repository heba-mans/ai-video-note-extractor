from sqlalchemy.orm import Session

from app.db.models.artifact import Artifact


def create_artifact(
    db: Session,
    *,
    job_id,
    type: str,
    storage_uri: str,
    content_sha256: str | None = None,
    size_bytes: int | None = None,
    meta: dict | None = None,
) -> Artifact:
    art = Artifact(
        job_id=job_id,
        type=type,
        storage_uri=storage_uri,
        content_sha256=content_sha256,
        size_bytes=size_bytes,
        meta=meta,
    )
    db.add(art)
    db.commit()
    db.refresh(art)
    return art
from __future__ import annotations

from pathlib import Path
from uuid import UUID

from celery import shared_task
from sqlalchemy.orm import Session
from yt_dlp import YoutubeDL

from app.core.logging import get_logger
from app.db.models.artifact import ArtifactType
from app.db.models.job import Job, JobStatus
from app.db.repositories.artifacts import get_artifact, upsert_artifact
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.session import SessionLocal
from app.services.job_events_service import log_error, log_status_change
from app.services.storage_service import ensure_job_dir, sha256_file

logger = get_logger()


def _set_status(db: Session, job: Job, to_status: str, stage: str, progress: int) -> None:
    from_status = job.status
    update_job_fields(db, job, status=to_status, stage=stage, progress=progress)
    if from_status != to_status:
        log_status_change(db, job, from_status=from_status, to_status=to_status, stage=stage)


@shared_task(bind=True, max_retries=3)
def download_audio(self, job_id: str) -> dict[str, str]:
    """
    Download best audio for the job's video (YouTube) using yt-dlp.
    Stores file under /app/data/jobs/<job_id>/audio.<ext> inside container.
    """
    logger.info("audio.download.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        # Build output dir
        out_dir = ensure_job_dir(job_id)
        out_template = str(out_dir / "audio.%(ext)s")

        # ✅ If we already have an audio artifact + file exists, skip download
        existing = get_artifact(db, job_id=job.id, type=ArtifactType.AUDIO.value)
        if existing and existing.storage_uri.startswith("file://"):
            existing_path = Path(existing.storage_uri.replace("file://", ""))
            if existing_path.exists() and existing_path.stat().st_size > 0:
                logger.info("audio.download.skip", job_id=job_id, path=str(existing_path))
                return {"status": "skipped", "path": str(existing_path)}

        # Only download if job is in a state where download makes sense
        _set_status(db, job, JobStatus.DOWNLOADING.value, stage="download_audio", progress=10)

        # We use canonical_url stored on the video record (already normalized)
        video_url = job.video.canonical_url

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": out_template,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,

            # ✅ FIX: avoid .part rename race / FS issues
            "nopart": True,
            "overwrites": True,
        }

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)

        # ✅ Find the actual file yt-dlp produced inside out_dir
        candidates = sorted(
            out_dir.glob("audio.*"),
            key=lambda p: p.stat().st_size if p.exists() else 0,
            reverse=True,
        )
        if not candidates:
            raise RuntimeError(f"yt-dlp produced no output file in {out_dir}")

        file_path = candidates[0]

        # ✅ Hard fail if file is missing (prevents phantom artifacts)
        if not file_path.exists():
            raise RuntimeError(f"Downloaded file not found: {file_path}")

        size_bytes = file_path.stat().st_size
        checksum = sha256_file(file_path)
        storage_uri = f"file://{file_path.resolve()}"

        # ✅ Upsert so we do not create duplicate AUDIO artifacts for same job
        upsert_artifact(
            db,
            job_id=job.id,
            type=ArtifactType.AUDIO.value,
            storage_uri=storage_uri,
            content_sha256=checksum,
            size_bytes=size_bytes,
            meta={
                "ext": file_path.suffix.lstrip("."),
                "title": info.get("title"),
                "webpage_url": info.get("webpage_url"),
                "extractor": info.get("extractor"),
            },
        )

        logger.info("audio.download.done", job_id=job_id, path=str(file_path))
        return {"status": "ok", "path": str(file_path)}

    except Exception as e:
        db.rollback()
        logger.exception("audio.download.failed", job_id=job_id)

        attempt = int(getattr(self.request, "retries", 0))
        max_retries = int(getattr(self, "max_retries", 3))
        is_last_attempt = attempt >= max_retries

        job = db.query(Job).filter(Job.id == UUID(job_id)).one_or_none()
        if job:
            update_job_fields(
                db,
                job,
                retry_count=(job.retry_count or 0) + 1,
                error_code=type(e).__name__,
                error_message=str(e),
            )

            if is_last_attempt:
                update_job_fields(db, job, status=JobStatus.FAILED.value, stage="download_failed")
                log_error(db, job, message="Audio download failed", meta={"error": str(e)})

        db.close()

        if is_last_attempt:
            raise

        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        try:
            db.close()
        except Exception:
            pass
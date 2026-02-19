from __future__ import annotations

from pathlib import Path
from uuid import UUID

from celery import shared_task
from faster_whisper import WhisperModel

from app.core.logging import get_logger
from app.db.models.artifact import ArtifactType
from app.db.models.job import Job, JobStatus
from app.db.repositories.artifacts import get_artifact
from app.db.repositories.jobs import get_job_for_update, update_job_fields
from app.db.repositories.transcript_segments import delete_segments_for_job, insert_segments
from app.db.session import SessionLocal
from app.services.job_events_service import log_error
from app.services.transcript_chunking_service import build_transcript_chunks
from app.db.repositories.transcript_chunks import delete_chunks_for_job, insert_chunks
from app.services.job_progress import PROGRESS_STEPS
from app.services.job_progress_service import set_job_progress

logger = get_logger()

# ✅ Global model cache (loaded once per worker process)
_MODEL: WhisperModel | None = None


def _ms(seconds: float) -> int:
    return int(seconds * 1000)


def get_model() -> WhisperModel:
    """
    Load model once per worker process.
    Model files will be cached under /app/models (mounted volume recommended).
    """
    global _MODEL
    if _MODEL is None:
        # Start with "base" for good speed/quality tradeoff on CPU
        model_name = "base"
        _MODEL = WhisperModel(
            model_name,
            device="cpu",
            compute_type="int8",
            download_root="/app/models",
        )
        logger.info("whisper.model.loaded", model=model_name)
    return _MODEL


@shared_task(bind=True, max_retries=3)
def transcribe_audio(self, job_id: str) -> dict[str, str]:
    logger.info("transcribe.start", job_id=job_id, task_id=self.request.id)

    db = SessionLocal()
    try:
        job_uuid = UUID(job_id)
        job = get_job_for_update(db, job_uuid)
        if not job:
            return {"status": "not_found"}

        # Find audio artifact
        audio_art = get_artifact(db, job_id=job.id, type=ArtifactType.AUDIO.value)
        if not audio_art or not audio_art.storage_uri.startswith("file://"):
            raise RuntimeError("Audio artifact not found for job")

        audio_path = Path(audio_art.storage_uri.replace("file://", ""))
        if not audio_path.exists():
            raise RuntimeError(f"Audio file missing: {audio_path}")

        # Update progress/status
        step = PROGRESS_STEPS["transcribe"]
        set_job_progress(db, job=job, status=step.status, stage=step.stage, progress=step.progress)

        # Clear existing transcript segments if re-run
        delete_segments_for_job(db, job.id)
        delete_chunks_for_job(db, job.id)

        model = get_model()

        # Run transcription (segments are streamed)
        segments_iter, info = model.transcribe(
            str(audio_path),
            vad_filter=False,
            beam_size=5,
        )

        segments_to_insert: list[dict] = []
        for idx, seg in enumerate(segments_iter):
            segments_to_insert.append(
                {
                    "idx": idx,
                    "start_ms": _ms(seg.start),
                    "end_ms": _ms(seg.end),
                    "text": (seg.text or "").strip(),
                }
            )

        if not segments_to_insert:
            raise RuntimeError("No transcript segments produced")

        insert_segments(db, job.id, segments_to_insert)

        # ✅ Build + persist chunks (TRANS-5)
        chunks = build_transcript_chunks(segments_to_insert)
        if not chunks:
            raise RuntimeError("No transcript chunks produced")

        insert_chunks(db, job.id, chunks)
        db.commit()

        logger.info(
            "transcribe.done",
            job_id=job_id,
            segments=len(segments_to_insert),
            chunks=len(chunks),
        )
        return {"status": "ok", "segments": str(len(segments_to_insert)), "chunks": str(len(chunks))}

    except Exception as e:
        db.rollback()
        logger.exception("transcribe.failed", job_id=job_id)

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
                update_job_fields(db, job, status=JobStatus.FAILED.value, stage="transcribe_failed")
                log_error(db, job, message="Transcription failed", meta={"error": str(e)})

        if is_last_attempt:
            raise

        raise self.retry(exc=e, countdown=2**attempt)

    finally:
        db.close()
from __future__ import annotations

from dataclasses import dataclass

from app.db.models.job import JobStatus


@dataclass(frozen=True)
class ProgressStep:
    status: str
    stage: str
    progress: int


# Canonical progress model (one place to adjust UI feel)
PROGRESS_STEPS: dict[str, ProgressStep] = {
    "download_audio": ProgressStep(status=JobStatus.DOWNLOADING.value, stage="download_audio", progress=10),
    "transcribe": ProgressStep(status=JobStatus.TRANSCRIBING.value, stage="transcribe", progress=40),
    "summarize": ProgressStep(status=JobStatus.SUMMARIZING.value, stage="summarize", progress=75),
    "finalize": ProgressStep(status=JobStatus.COMPLETED.value, stage="finalize", progress=100),
}
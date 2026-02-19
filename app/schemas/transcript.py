from __future__ import annotations

from pydantic import BaseModel


class TranscriptSegmentOut(BaseModel):
    idx: int
    start_ms: int
    end_ms: int
    text: str


class TranscriptPageOut(BaseModel):
    job_id: str
    total: int
    limit: int
    offset: int
    next_offset: int | None
    items: list[TranscriptSegmentOut]
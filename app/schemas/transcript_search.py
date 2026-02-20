from __future__ import annotations

from pydantic import BaseModel


class TranscriptSearchHit(BaseModel):
    idx: int
    start_ms: int
    end_ms: int
    text: str
    rank: float


class TranscriptSearchResponse(BaseModel):
    job_id: str
    query: str
    total: int
    limit: int
    offset: int
    next_offset: int | None
    items: list[TranscriptSearchHit]
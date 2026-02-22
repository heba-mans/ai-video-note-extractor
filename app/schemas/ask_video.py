from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class AskVideoRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=10)
    session_id: Optional[str] = None  # ✅ NEW


class AskVideoCitation(BaseModel):
    chunk_id: int
    idx: int
    start_seconds: float
    end_seconds: float

    # ✅ RAG-7 fields
    start_ts: str
    end_ts: str
    range_ts: str
    label: str

    distance: float
    preview: str


class AskVideoResponse(BaseModel):
    job_id: str
    session_id: str  # ✅ NEW
    question: str
    answer: str
    citations: List[AskVideoCitation]
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class JobCreateRequest(BaseModel):
    youtube_url: str = Field(..., min_length=5)
    params: dict[str, Any] | None = None


class JobResponse(BaseModel):
    id: UUID
    user_id: UUID
    video_id: UUID

    status: str
    stage: str | None = None
    progress: int | None = None

    requested_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    idempotency_key: str
    params_json: dict[str, Any] | None = None

    error_code: str | None = None
    error_message: str | None = None
    retry_count: int

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
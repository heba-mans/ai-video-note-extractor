from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class JobCreateRequest(BaseModel):
    youtube_url: str
    params: dict[str, Any] | None = None


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str

    # FE-26 polish fields
    created_at: datetime | None = None
    youtube_url: str | None = None
    title: str | None = None


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
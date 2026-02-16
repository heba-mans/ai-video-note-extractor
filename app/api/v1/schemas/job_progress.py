from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class JobProgressResponse(BaseModel):
    id: UUID
    status: str
    stage: str | None
    progress: int | None
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}
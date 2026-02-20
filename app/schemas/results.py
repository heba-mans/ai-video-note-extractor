from __future__ import annotations

from pydantic import BaseModel


class JobResultsOut(BaseModel):
    job_id: str
    payload: dict
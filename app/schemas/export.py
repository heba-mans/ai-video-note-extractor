from __future__ import annotations

from pydantic import BaseModel


class MarkdownExportOut(BaseModel):
    job_id: str
    markdown: str
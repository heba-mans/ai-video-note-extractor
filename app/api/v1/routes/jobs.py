from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.api.v1.schemas.job_progress import JobProgressResponse
from app.api.v1.schemas.jobs import JobCreateRequest, JobListResponse, JobResponse
from app.db.models.job import Job, JobStatus
from app.db.models.user import User
from app.db.repositories.final_results import get_final_result
from app.db.repositories.jobs import count_jobs_for_user, get_job, list_jobs_for_user
from app.db.repositories.transcript import count_segments, fetch_segments_page
from app.db.repositories.transcript_search import count_search_hits, search_segments
from app.schemas.export import MarkdownExportOut
from app.schemas.results import JobResultsOut
from app.schemas.transcript import TranscriptPageOut
from app.schemas.transcript_search import TranscriptSearchHit, TranscriptSearchResponse
from app.services.job_service import create_or_get_job_for_youtube
from app.workers.celery_app import celery_app
from app.services.rate_limiter import rate_limit_or_429
from app.core.config import settings

router = APIRouter(tags=["Jobs"])


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobResponse:
    """
    Create a processing job for a YouTube URL.

    Idempotent behavior:
    same user + same video + same params => returns existing job.
    """
    rate_limit_or_429(
        scope="jobs:create",
        identity=str(user.id),
        limit=settings.rate_limit_jobs_per_minute,
        window_seconds=60,
    )
    try:
        job = create_or_get_job_for_youtube(
            db,
            user_id=user.id,
            youtube_url=payload.youtube_url,
            params=payload.params,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    celery_app.send_task(
        "app.workers.tasks.process_job.process_job",
        args=[str(job.id)],
    )

    return JobResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobResponse:
    job = get_job(db, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse.model_validate(job)


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> JobListResponse:
    items = list_jobs_for_user(db, user.id, limit=limit, offset=offset)
    total = count_jobs_for_user(db, user.id)

    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in items],
        total=total,
    )


@router.get("/jobs/{job_id}/progress", response_model=JobProgressResponse)
def get_job_progress(
    job_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobProgressResponse:
    job = get_job(db, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobProgressResponse.model_validate(job)


@router.get("/jobs/{job_id}/transcript", response_model=TranscriptPageOut)
def get_job_transcript(
    job_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TranscriptPageOut:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    total = count_segments(db, job_id)
    rows = fetch_segments_page(db, job_id, limit=limit, offset=offset)
    next_offset = offset + limit if (offset + limit) < total else None

    return TranscriptPageOut(
        job_id=str(job_id),
        total=total,
        limit=limit,
        offset=offset,
        next_offset=next_offset,
        items=rows,
    )


@router.get("/jobs/{job_id}/transcript/search", response_model=TranscriptSearchResponse)
def search_job_transcript(
    job_id: UUID,
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TranscriptSearchResponse:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    total = count_search_hits(db, job_id, q)
    rows = search_segments(db, job_id, q, limit=limit, offset=offset)
    next_offset = offset + limit if (offset + limit) < total else None

    return TranscriptSearchResponse(
        job_id=str(job_id),
        query=q,
        total=total,
        limit=limit,
        offset=offset,
        next_offset=next_offset,
        items=[TranscriptSearchHit(**r) for r in rows],
    )


@router.get("/jobs/{job_id}/results", response_model=JobResultsOut)
def get_job_results(
    job_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobResultsOut:
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == JobStatus.FAILED.value:
        raise HTTPException(status_code=409, detail="Job failed; results unavailable")

    final = get_final_result(db, job_id)
    if final is None:
        raise HTTPException(status_code=404, detail="Results not ready")

    return JobResultsOut(job_id=str(job_id), payload=final.payload_json)


@router.get(
    "/jobs/{job_id}/export/markdown",
    responses={200: {"content": {"text/markdown": {}}}},
)
def export_job_markdown(
    job_id: UUID,
    format: str = Query("raw", pattern="^(raw|json)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == JobStatus.FAILED.value:
        raise HTTPException(status_code=409, detail="Job failed; export unavailable")

    final = get_final_result(db, job_id)
    if final is None:
        raise HTTPException(status_code=404, detail="Results not ready")

    markdown = (final.payload_json or {}).get("formatted_markdown")
    if not markdown:
        raise HTTPException(status_code=404, detail="Markdown not ready")

    if format == "json":
        return MarkdownExportOut(job_id=str(job_id), markdown=markdown)

    filename = f"job-{job_id}.md"
    headers = {"Content-Disposition": f'attachment; filename=\"{filename}\"'}
    return PlainTextResponse(markdown, media_type="text/markdown", headers=headers)
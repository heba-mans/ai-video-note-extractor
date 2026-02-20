from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.schemas.jobs import JobCreateRequest, JobListResponse, JobResponse
from app.db.repositories.jobs import count_jobs_for_user, get_job, list_jobs_for_user
from app.services.dev_auth import get_or_create_demo_user
from app.services.job_service import create_or_get_job_for_youtube
from app.workers.celery_app import celery_app
from app.api.v1.schemas.job_progress import JobProgressResponse
from fastapi import Query
from app.schemas.transcript import TranscriptPageOut, TranscriptSegmentOut
from app.db.repositories.transcript_segments import count_segments_for_job, list_segments_for_job
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models.job import Job

from fastapi import HTTPException

from app.db.repositories.final_results import get_final_result
from app.schemas.results import JobResultsOut
from app.db.models.job import JobStatus

router = APIRouter(tags=["Jobs"])


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreateRequest, db: Session = Depends(get_db)) -> JobResponse:
    """
    Create a processing job for a YouTube URL.

    Idempotent behavior:
    same user + same video + same params => returns existing job.
    """
    user = get_or_create_demo_user(db)

    try:
        job = create_or_get_job_for_youtube(
            db,
            user_id=user.id,
            youtube_url=payload.youtube_url,
            params=payload.params,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Enqueue processing (safe under idempotency; worker will skip if job not QUEUED)
    celery_app.send_task(
        "app.workers.tasks.process_job.process_job",
        args=[str(job.id)],
    )

    return JobResponse.model_validate(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(job_id: UUID, db: Session = Depends(get_db)) -> JobResponse:
    """
    Fetch job status/result metadata.
    """
    user = get_or_create_demo_user(db)

    job = get_job(db, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse.model_validate(job)


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> JobListResponse:
    """
    List jobs for the current user (demo user for now).
    """
    user = get_or_create_demo_user(db)

    items = list_jobs_for_user(db, user.id, limit=limit, offset=offset)
    total = count_jobs_for_user(db, user.id)

    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in items],
        total=total,
    )

@router.get("/jobs/{job_id}/progress", response_model=JobProgressResponse)
def get_job_progress(job_id: UUID, db: Session = Depends(get_db)) -> JobProgressResponse:
    user = get_or_create_demo_user(db)

    job = get_job(db, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobProgressResponse.model_validate(job)

@router.get("/jobs/{job_id}/transcript", response_model=TranscriptPageOut)
def get_job_transcript(
    job_id: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    # Ensure job exists (reuse your existing pattern)
    job_uuid = UUID(job_id)
    job = db.query(Job).filter(Job.id == job_uuid).one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    total = count_segments_for_job(db, job_uuid)
    rows = list_segments_for_job(db, job_uuid, limit=limit, offset=offset)

    items = [
        TranscriptSegmentOut(
            idx=r.idx,
            start_ms=r.start_ms,
            end_ms=r.end_ms,
            text=r.text,
        )
        for r in rows
    ]

    next_offset = offset + limit if (offset + limit) < total else None

    return TranscriptPageOut(
        job_id=job_id,
        total=total,
        limit=limit,
        offset=offset,
        next_offset=next_offset,
        items=items,
    )

@router.get("/jobs/{job_id}/results", response_model=JobResultsOut)
def get_job_results(job_id: str, db: Session = Depends(get_db)):
    # Validate UUID
    try:
        job_uuid = UUID(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    # Ensure job exists
    job = db.query(Job).filter(Job.id == job_uuid).one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # If job failed, surface that
    if job.status == JobStatus.FAILED.value:
        raise HTTPException(status_code=409, detail="Job failed; results unavailable")

    final = get_final_result(db, job_uuid)
    if final is None:
        # results not ready yet
        raise HTTPException(status_code=404, detail="Results not ready")

    return JobResultsOut(job_id=job_id, payload=final.payload_json)
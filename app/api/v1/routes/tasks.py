from fastapi import APIRouter

from app.workers.celery_app import celery_app

router = APIRouter(tags=["Tasks"])


@router.post("/tasks/ping")
def enqueue_ping() -> dict[str, str]:
    task = celery_app.send_task("app.workers.tasks.debug.ping")
    return {"task_id": task.id}
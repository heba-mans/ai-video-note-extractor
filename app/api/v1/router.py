from fastapi import APIRouter

from app.api.v1.routes.jobs import router as jobs_router
from app.api.v1.routes.auth import router as auth_router  # <-- add this

api_router = APIRouter()

api_router.include_router(jobs_router)
api_router.include_router(auth_router)
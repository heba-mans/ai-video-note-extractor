from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.db.models.user import User
from app.services.jwt_service import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_token_from_request(
    request: Request,
    creds: HTTPAuthorizationCredentials | None,
) -> str | None:
    # 1) Authorization: Bearer <token> (keeps Swagger/API clients working)
    if creds and creds.scheme and creds.scheme.lower() == "bearer":
        return creds.credentials

    # 2) Cookie token (browser SaaS pattern)
    cookie_name = getattr(settings, "AUTH_COOKIE_NAME", "access_token")
    return request.cookies.get(cookie_name)


def _parse_user_id(raw: str) -> str | UUID:
    """
    Your JWT 'sub' might be a UUID string.
    SQLAlchemy can usually handle either, but we normalize if possible.
    """
    try:
        return UUID(raw)
    except Exception:
        return raw


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = get_token_from_request(request, creds)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    user_id_raw = payload.get("sub") or payload.get("user_id")

    if not user_id_raw or not isinstance(user_id_raw, str):
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = _parse_user_id(user_id_raw)

    user = db.query(User).filter(User.id == user_id).one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
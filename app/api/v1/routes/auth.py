from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.db.models.user import User
from app.services.password_policy import validate_password
from app.services.security import hash_password, verify_password
from app.services.jwt_service import create_access_token
from app.core.config import settings
from app.services.rate_limiter import rate_limit_or_429

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    rate_limit_or_429(
        scope="auth:register",
        identity=payload.email.lower(),
        limit=settings.rate_limit_auth_per_minute,
        window_seconds=60,
    )
    # ✅ password policy
    try:
        validate_password(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    existing = db.query(User).filter(User.email == payload.email).one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    rate_limit_or_429(
        scope="auth:login",
        identity=payload.email.lower(),
        limit=settings.rate_limit_auth_per_minute,
        window_seconds=60,
    )
    user = db.query(User).filter(User.email == payload.email).one_or_none()

    # ✅ do not leak whether email exists
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, token_type="bearer")
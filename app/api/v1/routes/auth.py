from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.api.v1.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.config import settings
from app.db.models.user import User
from app.services.jwt_service import create_access_token
from app.services.password_policy import validate_password
from app.services.rate_limiter import rate_limit_or_429
from app.services.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=getattr(settings, "AUTH_COOKIE_NAME", "access_token"),
        value=token,
        httponly=True,
        secure=getattr(settings, "AUTH_COOKIE_SECURE", False),
        samesite=getattr(settings, "AUTH_COOKIE_SAMESITE", "lax"),
        max_age=getattr(settings, "AUTH_COOKIE_MAX_AGE_SECONDS", 60 * 60),
        path=getattr(settings, "AUTH_COOKIE_PATH", "/"),
    )


@router.post("/register", response_model=TokenResponse)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
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

    # ✅ Set httpOnly cookie (auto-login after register)
    _set_auth_cookie(response, token)

    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
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

    # ✅ Set httpOnly cookie
    _set_auth_cookie(response, token)

    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
    }

@router.post("/logout")
def logout(response: Response):
    cookie_name = getattr(settings, "AUTH_COOKIE_NAME", "access_token")
    response.delete_cookie(key=cookie_name, path="/")
    return {"ok": True}
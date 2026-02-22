from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    # ✅ auth/jwt
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")

    rate_limit_enabled: bool = Field(True, alias="RATE_LIMIT_ENABLED")
    rate_limit_jobs_per_minute: int = Field(10, alias="RATE_LIMIT_JOBS_PER_MINUTE")
    rate_limit_auth_per_minute: int = Field(20, alias="RATE_LIMIT_AUTH_PER_MINUTE")

    # Auth cookie settings
    AUTH_COOKIE_NAME: str = "access_token"
    AUTH_COOKIE_SECURE: bool = False  # True in prod (https)
    AUTH_COOKIE_SAMESITE: str = "lax"  # "lax" is good SaaS default
    AUTH_COOKIE_PATH: str = "/"
    AUTH_COOKIE_MAX_AGE_SECONDS: int = 60 * 60  # 1 hour


settings = Settings()
from __future__ import annotations

from passlib.context import CryptContext

# ✅ Argon2 avoids bcrypt’s 72-byte limit and is modern/recommended
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)
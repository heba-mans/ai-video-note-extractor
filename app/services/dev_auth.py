from __future__ import annotations

import uuid
from sqlalchemy.orm import Session

from app.db.models.user import User


DEMO_EMAIL = "demo@example.com"


def get_or_create_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
    if user:
        return user

    user = User(id=uuid.uuid4(), email=DEMO_EMAIL, password_hash=None)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
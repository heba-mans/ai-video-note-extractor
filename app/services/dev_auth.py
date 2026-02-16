from sqlalchemy.orm import Session

from app.db.models.user import User


DEMO_EMAIL = "demo@local"
DEMO_PASSWORD_HASH = "not-a-real-hash"  # portfolio/dev only


def get_or_create_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
    if user:
        return user

    user = User(email=DEMO_EMAIL, password_hash=DEMO_PASSWORD_HASH)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
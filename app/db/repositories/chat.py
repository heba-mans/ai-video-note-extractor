from __future__ import annotations

import uuid
from sqlalchemy.orm import Session

from app.db.models.chat_session import ChatSession
from app.db.models.chat_message import ChatMessage


def create_chat_session(db: Session, *, user_id: uuid.UUID, job_id: uuid.UUID, title: str | None = None) -> ChatSession:
    s = ChatSession(user_id=user_id, job_id=job_id, title=title)
    db.add(s)
    db.flush()
    return s


def get_chat_session(db: Session, *, session_id: uuid.UUID) -> ChatSession | None:
    return db.query(ChatSession).filter(ChatSession.id == session_id).one_or_none()


def add_message(
    db: Session,
    *,
    session_id: uuid.UUID,
    role: str,
    content: str,
    citations_json=None,
) -> ChatMessage:
    m = ChatMessage(session_id=session_id, role=role, content=content, citations_json=citations_json)
    db.add(m)
    db.flush()
    return m


def list_messages(db: Session, *, session_id: uuid.UUID, limit: int = 50) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
        .all()
    )[::-1]  # return chronological
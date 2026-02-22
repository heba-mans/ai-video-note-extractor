from __future__ import annotations

from uuid import UUID

from app.services.llm_client import LLMClient
from app.services.retrieval_service import retrieve_top_k_chunks
from app.db.repositories.chat import create_chat_session, get_chat_session, add_message, list_messages
from app.services.text_sanitize import strip_control_chars


def _chunk_preview(text: str, n: int = 220) -> str:
    t = " ".join((text or "").split())
    return t[:n] + ("..." if len(t) > n else "")


def _fmt_ts(seconds: float) -> str:
    s = int(max(0, seconds))
    m = s // 60
    ss = s % 60
    return f"{m}:{ss:02d}"


def build_context_md(hits: list[dict]) -> str:
    lines: list[str] = []
    for h in hits:
        lines.append(
            f"### Chunk {h['idx']} ({h['start_seconds']:.1f}s - {h['end_seconds']:.1f}s)\n"
            f"{h['text']}\n"
        )
    return "\n".join(lines).strip()


def build_history_md(messages) -> str:
    """
    Compact chat history for the LLM.
    """
    lines: list[str] = []
    for m in messages:
        role = m.role.upper()
        lines.append(f"**{role}:** {m.content}")
    return "\n".join(lines).strip()


def ask_video(
    db,
    *,
    job_id: UUID,
    user_id: UUID,
    question: str,
    k: int = 5,
    session_id: UUID | None = None,
    history_limit: int = 10,
) -> tuple[UUID, str, list[dict]]:
    question = strip_control_chars(question).strip()

    # ✅ Create or validate session
    if session_id is None:
        session = create_chat_session(db, user_id=user_id, job_id=job_id, title=None)
        session_id = session.id
    else:
        session = get_chat_session(db, session_id=session_id)
        if session is None or session.user_id != user_id or session.job_id != job_id:
            raise ValueError("Invalid session_id")

    # ✅ Persist user message
    add_message(db, session_id=session_id, role="user", content=question, citations_json=None)

    hits = retrieve_top_k_chunks(db, job_id=job_id, query=question, k=k)
    llm = LLMClient()

    history = list_messages(db, session_id=session_id, limit=history_limit)
    history_md = strip_control_chars(build_history_md(history[:-1])).strip() if history else ""

    if not hits:
        context_md = "(no relevant transcript found)"
    else:
        context_md = strip_control_chars(build_context_md(hits)).strip()

    combined_context = ""
    if history_md:
        combined_context += "## Chat History\n" + history_md + "\n\n"
    combined_context += "## Retrieved Transcript Context\n" + context_md

    answer = strip_control_chars(llm.answer_question(question=question, context_md=combined_context)).strip()

    citations: list[dict] = []
    for h in hits:
        start_s = float(h["start_seconds"])
        end_s = float(h["end_seconds"])
        start_ts = _fmt_ts(start_s)
        end_ts = _fmt_ts(end_s)
        range_ts = f"{start_ts}–{end_ts}"

        preview = strip_control_chars(_chunk_preview(h.get("text") or ""))

        citations.append(
            {
                "chunk_id": int(h["id"]),
                "idx": int(h["idx"]),
                "start_seconds": start_s,
                "end_seconds": end_s,
                "distance": float(h.get("distance", 0.0)),
                "preview": preview,
                "start_ts": start_ts,
                "end_ts": end_ts,
                "range_ts": range_ts,
                "label": f"[{range_ts}]",
            }
        )

    # ✅ Persist assistant message
    add_message(db, session_id=session_id, role="assistant", content=answer, citations_json=citations)

    return session_id, answer, citations
from __future__ import annotations

import re
from uuid import UUID

from app.services.llm_client import LLMClient
from app.services.retrieval_service import retrieve_top_k_chunks
from app.db.repositories.chat import create_chat_session, get_chat_session, add_message, list_messages
from app.db.repositories.final_results import get_final_result
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
    lines: list[str] = []
    for m in messages:
        role = m.role.upper()
        lines.append(f"**{role}:** {m.content}")
    return "\n".join(lines).strip()


_BROAD_PAT = re.compile(
    r"\b(summary|summarize|overview|takeaways|key takeaways|action items|chapters|outline|tl;dr)\b",
    re.IGNORECASE,
)


def _is_broad_question(q: str) -> bool:
    return bool(_BROAD_PAT.search(q))


def _results_context_md(db, job_id: UUID) -> str:
    """
    Best-effort: include precomputed results if available to answer broad questions.
    """
    final = get_final_result(db, job_id)
    if final is None or not isinstance(final.payload_json, dict):
        return ""

    p = final.payload_json
    parts: list[str] = ["## Precomputed Notes (from Results tab)"]

    summary = p.get("summary") or p.get("final_summary") or ""
    if isinstance(summary, str) and summary.strip():
        parts.append("### Summary\n" + summary.strip())

    takeaways = p.get("key_takeaways") or []
    if isinstance(takeaways, list) and takeaways:
        items = [str(x).strip() for x in takeaways if str(x).strip()]
        if items:
            parts.append("### Key takeaways\n" + "\n".join(f"- {x}" for x in items))

    actions = p.get("action_items") or []
    if isinstance(actions, list) and actions:
        # action items may be list[str] or list[dict]
        lines: list[str] = []
        for a in actions:
            if isinstance(a, str):
                s = a.strip()
                if s:
                    lines.append(f"- {s}")
            elif isinstance(a, dict):
                c = str(a.get("content") or "").strip()
                if c:
                    lines.append(f"- {c}")
        if lines:
            parts.append("### Action items\n" + "\n".join(lines))

    chapters = p.get("chapters") or []
    if isinstance(chapters, list) and chapters:
        lines: list[str] = []
        for ch in chapters:
            if not isinstance(ch, dict):
                continue
            title = str(ch.get("title") or "").strip() or "Chapter"
            rng = str(ch.get("range_ts") or "").strip()
            if rng:
                lines.append(f"- {title} ({rng})")
            else:
                lines.append(f"- {title}")
        if lines:
            parts.append("### Chapters\n" + "\n".join(lines))

    return "\n\n".join(parts).strip()


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
    if not question:
        raise ValueError("Question is empty")

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

    # History context (exclude the message we just added)
    history = list_messages(db, session_id=session_id, limit=history_limit)
    history_md = strip_control_chars(build_history_md(history[:-1])).strip() if history else ""

    broad = _is_broad_question(question)

    # Retrieval strategy:
    # - For broad questions, grab more context to reduce "not enough info"
    effective_k = max(k, 12) if broad else k

    hits = retrieve_top_k_chunks(db, job_id=job_id, query=question, k=effective_k)

    # If retrieval is weak (0 hits) and this is broad, try a second pass with higher k
    if broad and not hits and effective_k < 20:
        hits = retrieve_top_k_chunks(db, job_id=job_id, query=question, k=20)

    # Build transcript context
    if not hits:
        transcript_md = "(no relevant transcript found)"
    else:
        transcript_md = strip_control_chars(build_context_md(hits)).strip()

    # ✅ Results fallback context (for broad questions)
    results_md = _results_context_md(db, job_id) if broad else ""

    combined_context = ""
    if history_md:
        combined_context += "## Chat History\n" + history_md + "\n\n"

    if results_md:
        combined_context += results_md + "\n\n"

    combined_context += "## Retrieved Transcript Context\n" + transcript_md

    # Ask LLM
    llm = LLMClient()
    try:
        answer = strip_control_chars(
            llm.answer_question(question=question, context_md=combined_context)
        ).strip()
        if not answer:
            raise ValueError("LLM returned an empty answer")
    except Exception as e:
        err_text = f"LLM failed to answer: {e}"
        add_message(db, session_id=session_id, role="assistant", content=err_text, citations_json=[])
        raise ValueError(err_text) from e

    # Citations
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
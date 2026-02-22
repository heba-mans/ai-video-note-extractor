from __future__ import annotations

from uuid import UUID

from app.services.llm_client import LLMClient
from app.services.retrieval_service import retrieve_top_k_chunks


def _chunk_preview(text: str, n: int = 220) -> str:
    t = " ".join((text or "").split())
    return t[:n] + ("..." if len(t) > n else "")


def _format_ts(seconds: float) -> str:
    """
    Convert seconds -> M:SS (or H:MM:SS if >= 1 hour)
    """
    total = int(round(seconds or 0))
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def build_context_md(hits: list[dict]) -> str:
    """
    Build a compact context block for the LLM with timestamps + chunk text.
    """
    lines: list[str] = []
    for h in hits:
        start_s = float(h["start_seconds"])
        end_s = float(h["end_seconds"])
        lines.append(
            f"### Chunk {h['idx']} ({_format_ts(start_s)} - {_format_ts(end_s)})\n"
            f"{h['text']}\n"
        )
    return "\n".join(lines).strip()


def ask_video(db, *, job_id: UUID, question: str, k: int = 5) -> tuple[str, list[dict]]:
    hits = retrieve_top_k_chunks(db, job_id=job_id, query=question, k=k)

    llm = LLMClient()

    # If no hits, still return a graceful answer
    if not hits:
        answer = llm.answer_question(question=question, context_md="(no relevant transcript found)")
        return answer, []

    context_md = build_context_md(hits)
    answer = llm.answer_question(question=question, context_md=context_md)

    # Build citations with formatted timestamps (RAG-7)
    citations: list[dict] = []
    for h in hits:
        start_s = float(h["start_seconds"])
        end_s = float(h["end_seconds"])
        start_ts = _format_ts(start_s)
        end_ts = _format_ts(end_s)
        range_ts = f"{start_ts}–{end_ts}"

        citations.append(
            {
                "chunk_id": int(h["id"]),
                "idx": int(h["idx"]),
                "start_seconds": start_s,
                "end_seconds": end_s,
                "start_ts": start_ts,
                "end_ts": end_ts,
                "range_ts": range_ts,
                "label": f"[{range_ts}]",
                "distance": float(h.get("distance", 0.0)),
                "preview": _chunk_preview(h.get("text") or ""),
            }
        )

    return answer, citations
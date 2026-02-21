from __future__ import annotations

from uuid import UUID

from app.services.llm_client import LLMClient
from app.services.retrieval_service import retrieve_top_k_chunks


def _chunk_preview(text: str, n: int = 220) -> str:
    t = " ".join((text or "").split())
    return t[:n] + ("..." if len(t) > n else "")


def build_context_md(hits: list[dict]) -> str:
    """
    Build a compact context block for the LLM with timestamps + chunk text.
    """
    lines: list[str] = []
    for h in hits:
        lines.append(
            f"### Chunk {h['idx']} ({h['start_seconds']:.1f}s - {h['end_seconds']:.1f}s)\n"
            f"{h['text']}\n"
        )
    return "\n".join(lines).strip()


def ask_video(db, *, job_id: UUID, question: str, k: int = 5) -> tuple[str, list[dict]]:
    hits = retrieve_top_k_chunks(db, job_id=job_id, query=question, k=k)

    # If no hits, still return a graceful answer
    llm = LLMClient()
    if not hits:
        answer = llm.answer_question(question=question, context_md="(no relevant transcript found)")
        return answer, []

    context_md = build_context_md(hits)
    answer = llm.answer_question(question=question, context_md=context_md)

    # add preview in citations
    citations: list[dict] = []
    for h in hits:
        citations.append(
            {
                "chunk_id": int(h["id"]),
                "idx": int(h["idx"]),
                "start_seconds": float(h["start_seconds"]),
                "end_seconds": float(h["end_seconds"]),
                "distance": float(h.get("distance", 0.0)),
                "preview": _chunk_preview(h.get("text") or ""),
            }
        )

    return answer, citations
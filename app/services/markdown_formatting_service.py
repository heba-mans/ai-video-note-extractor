from __future__ import annotations

from datetime import datetime
from typing import Optional


def _utc_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def normalize_bullets(md: str) -> str:
    """
    Normalize bullets to '- ' and clean extra whitespace.
    """
    lines = (md or "").splitlines()
    out: list[str] = []
    for line in lines:
        stripped = line.strip()

        # keep empty lines
        if not stripped:
            out.append("")
            continue

        # normalize bullet variants
        if stripped.startswith(("* ", "• ", "– ", "— ")):
            stripped = "- " + stripped[2:].strip()

        out.append(stripped)
    return "\n".join(out).strip() + "\n"


def ensure_h2_sections(md: str) -> str:
    """
    Ensure key section headings exist and are H2 (##).
    If missing, add them.
    """
    md = md.strip()

    # if model returned H1 only, convert to H2 for consistency
    lines = md.splitlines()
    fixed: list[str] = []
    for line in lines:
        if line.startswith("# ") and not line.startswith("## "):
            fixed.append("## " + line[2:])
        else:
            fixed.append(line)
    md = "\n".join(fixed).strip()

    # Add Summary heading if none exists
    if "## Summary" not in md and "## (MOCK) Final Summary" not in md:
        md = "## Summary\n\n" + md

    return md.strip() + "\n"


def build_final_markdown(
    *,
    job_id: str,
    final_summary_md: str,
    include_chunk_summaries: bool = False,
    chunk_summaries_md: Optional[str] = None,
) -> str:
    """
    Produce the final user-facing markdown note.
    """
    header = (
        f"# AI Video Notes\n\n"
        f"- Job ID: `{job_id}`\n"
        f"- Generated: `{_utc_iso()}`\n\n"
        "---\n\n"
    )

    body = ensure_h2_sections(normalize_bullets(final_summary_md))

    if include_chunk_summaries and chunk_summaries_md:
        chunk_block = normalize_bullets(chunk_summaries_md)
        body += (
            "\n---\n\n"
            "<details>\n"
            "<summary>Chunk Summaries (debug)</summary>\n\n"
            f"{chunk_block}\n"
            "</details>\n"
        )

    return header + body
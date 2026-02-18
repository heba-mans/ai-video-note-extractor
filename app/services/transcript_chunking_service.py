from __future__ import annotations

from typing import List, Dict

MAX_CHUNK_CHARS = 4000  # ~800–1200 tokens-ish, depends on language


def build_transcript_chunks(segments: List[Dict]) -> List[Dict]:
    chunks = []
    current_text = []
    current_start_s = None
    current_end_s = None
    current_length = 0
    chunk_idx = 0

    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue

        seg_start_s = float(seg["start_ms"]) / 1000.0
        seg_end_s = float(seg["end_ms"]) / 1000.0

        if current_start_s is None:
            current_start_s = seg_start_s

        if current_text and (current_length + len(text) + 1 > MAX_CHUNK_CHARS):
            chunks.append(
                {
                    "idx": chunk_idx,
                    "start_seconds": current_start_s,
                    "end_seconds": float(current_end_s or current_start_s),
                    "text": " ".join(current_text).strip(),
                }
            )
            chunk_idx += 1
            current_text = []
            current_length = 0
            current_start_s = seg_start_s

        current_text.append(text)
        current_length += len(text) + 1
        current_end_s = seg_end_s

    if current_text and current_start_s is not None:
        chunks.append(
            {
                "idx": chunk_idx,
                "start_seconds": current_start_s,
                "end_seconds": float(current_end_s or current_start_s),
                "text": " ".join(current_text).strip(),
            }
        )

    return chunks

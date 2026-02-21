from __future__ import annotations

import os
import hashlib
from typing import List

from openai import OpenAI


EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
EMBED_DIM = int(os.getenv("OPENAI_EMBED_DIM", "1536"))  # must match vector(1536)


def _mock_embedding(text: str, dim: int = EMBED_DIM) -> List[float]:
    """
    Deterministic pseudo-embedding for dev (no OpenAI calls).
    This keeps your RAG pipeline testable with LLM_MOCK=1.
    """
    # hash -> repeatable bytes
    h = hashlib.sha256(text.encode("utf-8")).digest()
    # expand bytes into floats in [-1, 1]
    out: List[float] = []
    i = 0
    while len(out) < dim:
        b = h[i % len(h)]
        out.append(((b / 255.0) * 2.0) - 1.0)
        i += 1
    return out


def embed_text(text: str) -> List[float]:
    text = (text or "").strip()
    if not text:
        return [0.0] * EMBED_DIM

    # If you're mocking, do NOT hit OpenAI
    if os.getenv("LLM_MOCK", "0") == "1":
        return _mock_embedding(text)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing (or set LLM_MOCK=1)")

    client = OpenAI(api_key=api_key)

    resp = client.embeddings.create(
        model=EMBED_MODEL,
        input=text,
    )

    vec = resp.data[0].embedding
    if len(vec) != EMBED_DIM:
        raise RuntimeError(f"Embedding dim mismatch: got {len(vec)}, expected {EMBED_DIM}")

    return vec
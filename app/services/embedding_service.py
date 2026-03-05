from __future__ import annotations

import os
from typing import List

from app.services.embeddings_client import EmbeddingsClient, EMBED_DIM


def embed_text(text: str) -> List[float]:
    """
    Provider-aware embedding function used by retrieval.

    Controlled by env:
      - EMBEDDINGS_MOCK=1            -> deterministic mock embeddings
      - EMBEDDINGS_PROVIDER=ollama   -> Ollama embeddings
      - EMBEDDINGS_PROVIDER=openai   -> OpenAI embeddings (requires OPENAI_API_KEY)

    NOTE: This function intentionally does NOT depend on LLM_MOCK.
    """
    t = (text or "").strip()
    if not t:
        return [0.0] * EMBED_DIM

    client = EmbeddingsClient()
    return client.embed(t)
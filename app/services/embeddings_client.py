from __future__ import annotations

import hashlib
import os
from typing import List

import requests
from openai import OpenAI

EMBED_DIM = 1536  # pgvector column is Vector(1536)


def _fix_dim(vec: List[float]) -> List[float]:
    """
    Ensure embedding is exactly EMBED_DIM (1536).
    If shorter -> pad zeros; if longer -> truncate.
    """
    if len(vec) == EMBED_DIM:
        return vec
    if len(vec) > EMBED_DIM:
        return vec[:EMBED_DIM]
    return vec + [0.0] * (EMBED_DIM - len(vec))


class EmbeddingsClient:
    def __init__(self) -> None:
        self.mock = os.getenv("EMBEDDINGS_MOCK", "0") == "1"
        self.provider = os.getenv("EMBEDDINGS_PROVIDER", "openai").strip().lower()

        self.model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

        # Ollama config
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.ollama_embed_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text").strip()

        if self.mock or self.provider == "mock":
            self.client = None
            return

        if self.provider == "ollama":
            self.client = None
            return

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing (or set EMBEDDINGS_MOCK=1, or EMBEDDINGS_PROVIDER=ollama)")
        self.client = OpenAI(api_key=api_key)

    def _ollama_embed(self, text: str) -> List[float]:
        url = f"{self.ollama_base_url}/api/embeddings"
        payload = {"model": self.ollama_embed_model, "prompt": text}
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        emb = data.get("embedding") if isinstance(data, dict) else None
        if not isinstance(emb, list):
            raise RuntimeError("Invalid Ollama embeddings response")
        vec = [float(x) for x in emb]
        return _fix_dim(vec)

    def embed(self, text: str) -> List[float]:
        text = (text or "").strip()
        if not text:
            return [0.0] * EMBED_DIM

        if self.mock or self.provider == "mock":
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vals = []
            for i in range(EMBED_DIM):
                b = h[i % len(h)]
                vals.append(((b / 255.0) * 2.0) - 1.0)  # [-1, 1]
            return vals

        if self.provider == "ollama":
            return self._ollama_embed(text)

        resp = self.client.embeddings.create(model=self.model, input=text)
        return _fix_dim(resp.data[0].embedding)
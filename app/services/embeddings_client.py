from __future__ import annotations

import hashlib
import os
from typing import List

from openai import OpenAI


EMBED_DIM = 1536  # text-embedding-3-small


class EmbeddingsClient:
    def __init__(self) -> None:
        self.mock = os.getenv("EMBEDDINGS_MOCK", "0") == "1"
        self.model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

        if self.mock:
            self.client = None
            return

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing (or set EMBEDDINGS_MOCK=1)")
        self.client = OpenAI(api_key=api_key)

    def embed(self, text: str) -> List[float]:
        text = (text or "").strip()
        if not text:
            # return deterministic zero vector for empty text
            return [0.0] * EMBED_DIM

        if self.mock:
            # deterministic pseudo-embedding from sha256
            h = hashlib.sha256(text.encode("utf-8")).digest()
            vals = []
            for i in range(EMBED_DIM):
                b = h[i % len(h)]
                vals.append(((b / 255.0) * 2.0) - 1.0)  # [-1, 1]
            return vals

        resp = self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return resp.data[0].embedding
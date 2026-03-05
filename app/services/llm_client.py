from __future__ import annotations

import json
import os
from typing import Any

import requests
from openai import OpenAI


class LLMClient:
    def __init__(self) -> None:
        self.mock = os.getenv("LLM_MOCK", "0") == "1"
        self.fail_once = os.getenv("LLM_FAIL_ONCE", "0") == "1"

        self.provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        # Ollama config
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1").strip()

        if self.mock:
            self.client = None
            return

        if self.provider == "ollama":
            self.client = None
            return

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing (or set LLM_MOCK=1, or LLM_PROVIDER=ollama)")
        self.client = OpenAI(api_key=api_key)

    def _ollama_chat(self, *, system: str, user: str) -> str:
        """
        Non-streaming Ollama chat call.
        Requires local ollama server running: ollama serve
        """
        url = f"{self.ollama_base_url}/api/chat"
        payload: dict[str, Any] = {
            "model": self.ollama_model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        msg = data.get("message", {}) if isinstance(data, dict) else {}
        content = msg.get("content") if isinstance(msg, dict) else None
        return (content or "").strip()

    def summarize_chunk(self, *, chunk_text: str) -> str:
        if self.mock:
            text = " ".join((chunk_text or "").split())
            preview = text[:500]
            return (
                "- **(MOCK) Summary**\n"
                f"- Preview: {preview}...\n"
                "- Notes: Replace mock with OpenAI by setting LLM_MOCK=0 and adding OPENAI_API_KEY.\n"
            )

        system = (
            "You summarize transcript chunks. "
            "Return concise markdown with bullet points. "
            "No preamble."
        )
        user = (
            "Summarize this transcript chunk.\n\n"
            "Rules:\n"
            "- 4–8 bullet points\n"
            "- Preserve key facts and names\n"
            "- If it’s comedic/banter, summarize the topic and notable beats\n\n"
            f"CHUNK:\n{chunk_text}"
        )

        if self.provider == "ollama":
            return self._ollama_chat(system=system, user=user)

        resp = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return (resp.output_text or "").strip()

    def reduce_summaries(self, *, map_summaries_md: str) -> str:
        if getattr(self, "fail_once", False):
            self.fail_once = False
            raise RuntimeError("timeout: simulated transient LLM failure")

        if self.mock:
            preview = " ".join(map_summaries_md.split())[:700]
            return (
                "## (MOCK) Final Summary\n\n"
                "- Combined map summaries into a single note.\n"
                f"- Preview: {preview}...\n"
            )

        system = (
            "You combine multiple partial summaries into one coherent final summary. "
            "Return clean markdown. No preamble."
        )
        user = (
            "Combine the following chunk summaries into one final note.\n\n"
            "Output format (markdown):\n"
            "## Summary\n"
            "- 5–10 bullet points\n\n"
            "## Key Moments\n"
            "- 5–10 bullets (short)\n\n"
            "## Notable Quotes (optional)\n"
            "- up to 3\n\n"
            "CHUNK SUMMARIES:\n"
            f"{map_summaries_md}"
        )

        if self.provider == "ollama":
            return self._ollama_chat(system=system, user=user)

        resp = self.client.responses.create(
            model=self.model,
            input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return (resp.output_text or "").strip()

    def extract_chapters(self, *, map_summaries_md: str) -> str:
        if self.mock:
            return "### 0:00 - 4:13 | Overview\n- (MOCK) High-level intro and main beats\n"

        system = (
            "You create chapters with timestamps from summaries. "
            "Output must be markdown, one chapter per heading."
        )
        user = (
            "Create 3–8 chapters with timestamps based on the following chunk summaries.\n\n"
            "Format STRICTLY like:\n"
            "### M:SS - M:SS | Chapter Title\n"
            "- bullet\n"
            "- bullet\n\n"
            "Rules:\n"
            "- Chapter boundaries must be chronological\n"
            "- Use timestamps within the video duration implied by the chunks\n"
            "- Keep titles short\n\n"
            f"{map_summaries_md}"
        )

        if self.provider == "ollama":
            return self._ollama_chat(system=system, user=user)

        resp = self.client.responses.create(
            model=self.model,
            input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return (resp.output_text or "").strip()

    def extract_key_takeaways(self, summary_md: str) -> list[str]:
        if self.mock:
            return [
                "The video humorously compares gym culture to a muscular kangaroo.",
                "Physical exaggeration is used as a comedic device.",
                "Animal behavior is reframed through human gym stereotypes.",
            ]

        system = "Extract key takeaways. Return a plain bullet list. No preamble."
        user = (
            "Extract 3-7 concise key takeaways from the following summary.\n"
            "Return them as a plain bullet list.\n\n"
            f"Summary:\n{summary_md}"
        )

        if self.provider == "ollama":
            text = self._ollama_chat(system=system, user=user)
        else:
            resp = self.client.responses.create(model=self.model, input=[{"role": "system", "content": system}, {"role": "user", "content": user}])
            text = resp.output_text or ""

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        out: list[str] = []
        for line in lines:
            if line.startswith("-"):
                out.append(line.strip("- ").strip())
            else:
                out.append(line.strip())
        return [x for x in out if x]

    def extract_action_items(self, summary_md: str) -> list[dict]:
        if self.mock:
            return [
                {"content": "Draft a short written summary of the video for sharing.", "owner": None, "due_date": None},
                {"content": "Create a social post highlighting the funniest moment.", "owner": None, "due_date": None},
                {"content": "Add chapters + takeaways into the final notes export.", "owner": None, "due_date": None},
            ]

        system = "Extract actionable follow-ups from summaries. Output JSON only."
        user = (
            "Extract 3-8 action items from this summary.\n"
            "Return STRICT JSON array of objects with keys: content, owner (nullable), due_date (nullable).\n\n"
            f"{summary_md}"
        )

        if self.provider == "ollama":
            text = self._ollama_chat(system=system, user=user)
        else:
            resp = self.client.responses.create(
                model=self.model,
                input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            text = (resp.output_text or "").strip()

        # Best-effort JSON parse
        try:
            return json.loads(text)
        except Exception:
            # fallback: treat as bullet list
            items: list[dict] = []
            for line in text.split("\n"):
                s = line.strip().lstrip("-").strip()
                if s:
                    items.append({"content": s, "owner": None, "due_date": None})
            return items

    def answer_question(self, *, question: str, context_md: str) -> str:
        if self.mock:
            return (
                "## (MOCK) Answer\n\n"
                f"**Question:** {question}\n\n"
                "Based on the retrieved transcript context, here’s a placeholder answer.\n\n"
                "If you want real answers, set `LLM_MOCK=0` and provide `OPENAI_API_KEY`.\n"
            )

        system = (
            "You answer questions using ONLY the provided transcript context. "
            "If the answer is not in the context, say you don't have enough info. "
            "Be concise."
        )
        user = f"QUESTION:\n{question}\n\nCONTEXT:\n{context_md}\n"

        if self.provider == "ollama":
            return self._ollama_chat(system=system, user=user)

        resp = self.client.responses.create(
            model=self.model,
            input=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        )
        return (resp.output_text or "").strip()
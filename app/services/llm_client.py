from __future__ import annotations

import os

from openai import OpenAI


class LLMClient:
    def __init__(self) -> None:
        self.mock = os.getenv("LLM_MOCK", "0") == "1"

        api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        if self.mock:
            self.client = None
            return

        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing (or set LLM_MOCK=1)")

        self.client = OpenAI(api_key=api_key)

    def summarize_chunk(self, *, chunk_text: str) -> str:
        """
        Returns markdown summary text.
        """
        if self.mock:
            # deterministic mock output for dev/testing
            text = " ".join((chunk_text or "").split())
            preview = text[:500]
            return (
                "- **(MOCK) Summary**\n"
                f"- Preview: {preview}...\n"
                "- Notes: Replace mock with OpenAI by setting LLM_MOCK=0 and adding OPENAI_API_KEY.\n"
            )

        resp = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You summarize transcript chunks. "
                        "Return concise markdown with bullet points. "
                        "No preamble."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Summarize this transcript chunk.\n\n"
                        "Rules:\n"
                        "- 4–8 bullet points\n"
                        "- Preserve key facts and names\n"
                        "- If it’s comedic/banter, summarize the topic and notable beats\n\n"
                        f"CHUNK:\n{chunk_text}"
                    ),
                },
            ],
        )
        return (resp.output_text or "").strip()
    
    def reduce_summaries(self, *, map_summaries_md: str) -> str:
        """
        Combine multiple chunk summaries into one coherent final markdown summary.
        """
        if self.mock:
            preview = " ".join(map_summaries_md.split())[:700]
            return (
                "## (MOCK) Final Summary\n\n"
                "- Combined map summaries into a single note.\n"
                f"- Preview: {preview}...\n"
            )

        resp = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You combine multiple partial summaries into one coherent final summary. "
                        "Return clean markdown. No preamble."
                    ),
                },
                {
                    "role": "user",
                    "content": (
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
                    ),
                },
            ],
        )
        return (resp.output_text or "").strip()
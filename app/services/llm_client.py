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
    
    def extract_chapters(self, *, map_summaries_md: str) -> str:
        """
        Return markdown with chapters in a strict format:
        ### M:SS - M:SS | Title
        - bullet
        """
        if self.mock:
            return (
                "### 0:00 - 4:13 | Overview\n"
                "- (MOCK) High-level intro and main beats\n"
            )

        resp = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You create chapters with timestamps from summaries. "
                        "Output must be markdown, one chapter per heading."
                    ),
                },
                {
                    "role": "user",
                    "content": (
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
                    ),
                },
            ],
        )
        return (resp.output_text or "").strip()
    
    def extract_key_takeaways(self, summary_md: str) -> list[str]:
        if self.mock:
            return [
                "The video humorously compares gym culture to a muscular kangaroo.",
                "Physical exaggeration is used as a comedic device.",
                "Animal behavior is reframed through human gym stereotypes.",
            ]

        resp = self.client.responses.create(
            model="gpt-4.1-mini",
            input=f"""
    Extract 3-7 concise key takeaways from the following summary.
    Return them as a plain bullet list.

    Summary:
    {summary_md}
    """
        )

        text = resp.output[0].content[0].text

        return [
            line.strip("- ").strip()
            for line in text.split("\n")
            if line.strip()
        ]
    
    def extract_action_items(self, summary_md: str) -> list[dict]:
        """
        Returns list of dicts:
        {content, owner (optional), due_date (optional)}
        """
        if self.mock:
            return [
                {"content": "Draft a short written summary of the video for sharing.", "owner": None, "due_date": None},
                {"content": "Create a social post highlighting the funniest moment.", "owner": None, "due_date": None},
                {"content": "Add chapters + takeaways into the final notes export.", "owner": None, "due_date": None},
            ]

        resp = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": "Extract actionable follow-ups from summaries. Output JSON only."},
                {"role": "user", "content": (
                    "Extract 3-8 action items from this summary.\n"
                    "Return STRICT JSON array of objects with keys: content, owner (nullable), due_date (nullable).\n\n"
                    f"{summary_md}"
                )},
            ],
        )
        text = (resp.output_text or "").strip()
        import json
        return json.loads(text)
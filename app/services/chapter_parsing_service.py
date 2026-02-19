from __future__ import annotations

import re


_HEADER_RE = re.compile(r"^###\s+(\d+):(\d{2})\s*-\s*(\d+):(\d{2})\s*\|\s*(.+)$")


def _to_seconds(m: int, s: int) -> float:
    return float(m * 60 + s)


def parse_chapters_md(md: str) -> list[dict]:
    """
    Parse markdown like:
      ### 0:00 - 1:23 | Title
      - bullet
      - bullet

    Returns list of dicts with idx/start_seconds/end_seconds/title/bullets_md.
    """
    lines = (md or "").splitlines()
    chapters: list[dict] = []
    current = None
    bullets: list[str] = []

    def flush():
        nonlocal current, bullets
        if current is None:
            return
        current["bullets_md"] = "\n".join(bullets).strip()
        chapters.append(current)
        current = None
        bullets = []

    for line in lines:
        line = line.rstrip()
        m = _HEADER_RE.match(line.strip())
        if m:
            flush()
            start_m, start_s, end_m, end_s, title = m.groups()
            current = {
                "idx": len(chapters),
                "start_seconds": _to_seconds(int(start_m), int(start_s)),
                "end_seconds": _to_seconds(int(end_m), int(end_s)),
                "title": title.strip(),
                "bullets_md": "",
            }
            continue

        if current is not None:
            stripped = line.strip()
            if stripped.startswith("- "):
                bullets.append(stripped)
            elif stripped == "":
                # allow spacing inside chapter
                continue
            else:
                # treat as continuation
                bullets.append(f"- {stripped}")

    flush()
    return chapters
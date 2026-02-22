from __future__ import annotations

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


def format_timestamp(seconds: float) -> str:
    """0 -> 0:00, 65 -> 1:05, 3723 -> 1:02:03"""
    if seconds is None:
        return "0:00"
    total = int(round(seconds))
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def format_range(start_seconds: float, end_seconds: float) -> str:
    return f"{format_timestamp(start_seconds)}–{format_timestamp(end_seconds)}"


def youtube_deeplink(url: str | None, start_seconds: float) -> str | None:
    """
    Returns the same URL with t=<seconds> appended.
    Supports both youtube.com/watch?v= and youtu.be/<id>.
    """
    if not url:
        return None

    t = int(max(0, round(start_seconds)))
    parsed = urlparse(url)

    # If it's youtu.be/<id>, convert to youtube watch link (optional)
    if parsed.netloc.endswith("youtu.be"):
        video_id = parsed.path.lstrip("/")
        if not video_id:
            return url
        new_qs = {"v": video_id, "t": str(t)}
        return urlunparse(("https", "www.youtube.com", "/watch", "", urlencode(new_qs), ""))

    # Default: add/update query param t
    qs = parse_qs(parsed.query)
    qs["t"] = [str(t)]
    new_query = urlencode(qs, doseq=True)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))


def build_citations_md(citations: list[dict], video_url: str | None = None) -> str:
    """
    Creates a markdown list of citations like:
    - [0:00–4:14](<link>) (chunk 0)
    """
    if not citations:
        return ""

    lines: list[str] = ["## Sources"]
    for c in citations:
        start_s = float(c.get("start_seconds") or 0)
        end_s = float(c.get("end_seconds") or start_s)
        label = format_range(start_s, end_s)
        link = youtube_deeplink(video_url, start_s)

        if link:
            lines.append(f"- [{label}]({link})")
        else:
            lines.append(f"- {label}")

    return "\n".join(lines).strip() + "\n"
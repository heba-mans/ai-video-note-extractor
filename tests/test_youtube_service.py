import pytest

from app.services.youtube_service import extract_youtube_video_id, youtube_fingerprint


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ],
)
def test_extract_youtube_video_id(url: str, expected: str) -> None:
    assert extract_youtube_video_id(url) == expected


def test_youtube_fingerprint_is_stable() -> None:
    a = youtube_fingerprint("dQw4w9WgXcQ")
    b = youtube_fingerprint("dQw4w9WgXcQ")
    assert a == b
    assert len(a) == 64
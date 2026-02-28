from __future__ import annotations

import hashlib
from pathlib import Path
import os


DATA_DIR = Path(os.getenv("AIV_DATA_DIR", "./data")).resolve()

def ensure_job_dir(job_id: str) -> Path:
    p = DATA_DIR / "jobs" / job_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()
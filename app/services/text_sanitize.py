import re
from uuid import UUID

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

def strip_control_chars(s: str) -> str:
    return _CTRL.sub("", s or "")
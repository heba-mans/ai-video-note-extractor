"""enable pgvector extension

Revision ID: c0ffee123abc
Revises: 282d4dae5892
Create Date: 2026-02-21
"""

from typing import Sequence, Union
from alembic import op

revision: str = "c0ffee123abc"
down_revision: Union[str, Sequence[str], None] = "282d4dae5892"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS vector;")
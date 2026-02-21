"""add transcript chunk embeddings

Revision ID: da7a7a7a7a7a
Revises: c0ffee123abc
Create Date: 2026-02-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "da7a7a7a7a7a"
down_revision: Union[str, Sequence[str], None] = "c0ffee123abc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.add_column(
        "transcript_chunks",
        sa.Column("embedding", Vector(1536), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("transcript_chunks", "embedding")
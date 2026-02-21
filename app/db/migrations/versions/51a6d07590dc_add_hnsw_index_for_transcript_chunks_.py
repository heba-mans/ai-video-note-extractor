"""add hnsw index for transcript_chunks embedding

Revision ID: 51a6d07590dc
Revises: c0ffee123abc
Create Date: <auto>
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "51a6d07590dc"
down_revision: Union[str, Sequence[str], None] = "da7a7a7a7a7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ensure extension exists (safe even if already installed)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # HNSW index for cosine similarity on pgvector
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_transcript_chunks_embedding_hnsw
        ON transcript_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_transcript_chunks_embedding_hnsw;")
"""add hnsw index for transcript_segments embedding

Revision ID: 51a6d07590dc
Revises: da7a7a7a7a7a
Create Date: <auto>
"""
from typing import Sequence, Union

from alembic import op

revision: str = "51a6d07590dc"
down_revision: Union[str, Sequence[str], None] = "da7a7a7a7a7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # HNSW index for cosine similarity on pgvector
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_transcript_segments_embedding_hnsw
        ON transcript_segments
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_transcript_segments_embedding_hnsw;")
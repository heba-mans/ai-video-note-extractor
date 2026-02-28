from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy

revision: str = 'c76a3dd3f6f7'
down_revision: Union[str, Sequence[str], None] = '5b44915b7a5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'transcript_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('idx', sa.Integer(), nullable=False),
        sa.Column('start_seconds', sa.Float(), nullable=False),
        sa.Column('end_seconds', sa.Float(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.vector.VECTOR(dim=1536), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'idx', name='uq_chunk_job_idx'),
    )
    op.create_index(
        op.f('ix_transcript_chunks_job_id'),
        'transcript_chunks',
        ['job_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_transcript_chunks_job_id'), table_name='transcript_chunks')
    op.drop_table('transcript_chunks')
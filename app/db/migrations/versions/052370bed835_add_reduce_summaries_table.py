"""add reduce_summaries table

Revision ID: 052370bed835
Revises: 2afdf54f9868
Create Date: 2026-02-19 10:56:12.903027

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '052370bed835'
down_revision: Union[str, Sequence[str], None] = '2afdf54f9868'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reduce_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("summary_md", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", name="uq_reduce_summaries_job_id"),
    )
    op.create_index("ix_reduce_summaries_job_id", "reduce_summaries", ["job_id"])


def downgrade() -> None:
    # Be defensive: migration may have been empty previously
    op.execute("DROP INDEX IF EXISTS ix_reduce_summaries_job_id;")
    op.execute("DROP TABLE IF EXISTS reduce_summaries;")

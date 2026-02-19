"""add map_summaries table

Revision ID: 2afdf54f9868
Revises: 2e12c285529f
Create Date: 2026-02-19 09:00:45.437479
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2afdf54f9868"
down_revision: Union[str, Sequence[str], None] = "fb55abefb90d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "map_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idx", sa.Integer(), nullable=False),
        sa.Column("start_seconds", sa.Float(), nullable=False),
        sa.Column("end_seconds", sa.Float(), nullable=False),
        sa.Column("summary_md", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", "idx", name="uq_map_summaries_job_idx"),
    )
    op.create_index("ix_map_summaries_job_id", "map_summaries", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_map_summaries_job_id", table_name="map_summaries")
    op.drop_table("map_summaries")
"""add chapters table

Revision ID: f0000df31174
Revises: d131287cbc51
Create Date: 2026-02-19 15:15:10.073084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f0000df31174'
down_revision: Union[str, Sequence[str], None] = 'd131287cbc51'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idx", sa.Integer(), nullable=False),
        sa.Column("start_seconds", sa.Float(), nullable=False),
        sa.Column("end_seconds", sa.Float(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("bullets_md", sa.Text(), nullable=False, server_default=""),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", "idx", name="uq_chapters_job_idx"),
    )
    op.create_index("ix_chapters_job_id", "chapters", ["job_id"])


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_chapters_job_id;")
    op.execute("DROP TABLE IF EXISTS chapters;")

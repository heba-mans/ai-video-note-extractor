"""add formatted_results table

Revision ID: d131287cbc51
Revises: 052370bed835
Create Date: 2026-02-19 13:58:06.777110

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd131287cbc51'
down_revision: Union[str, Sequence[str], None] = '052370bed835'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "formatted_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("markdown", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", name="uq_formatted_results_job_id"),
    )
    op.create_index("ix_formatted_results_job_id", "formatted_results", ["job_id"])


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_formatted_results_job_id;")
    op.execute("DROP TABLE IF EXISTS formatted_results;")

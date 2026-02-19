"""add key_takeaways table

Revision ID: 315a3ae88619
Revises: 70e5408a11bb
Create Date: 2026-02-19 16:18:22.115428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '315a3ae88619'
down_revision: Union[str, Sequence[str], None] = 'f0000df31174'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "key_takeaways",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idx", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("job_id", "idx", name="uq_key_takeaways_job_idx"),
    )
    op.create_index("ix_key_takeaways_job_id", "key_takeaways", ["job_id"])


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_key_takeaways_job_id;")
    op.execute("DROP TABLE IF EXISTS key_takeaways;")

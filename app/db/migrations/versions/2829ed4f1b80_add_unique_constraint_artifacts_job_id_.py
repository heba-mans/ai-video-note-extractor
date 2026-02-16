from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2829ed4f1b80"
down_revision: Union[str, Sequence[str], None] = "98e9a5cb1d95"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Remove duplicates keeping the newest row per (job_id, type)
    op.execute(
        """
        DELETE FROM artifacts a
        USING artifacts b
        WHERE a.job_id = b.job_id
          AND a.type = b.type
          AND a.created_at < b.created_at;
        """
    )

    # 2) Add unique constraint
    op.create_unique_constraint(
        "uq_artifacts_job_type",
        "artifacts",
        ["job_id", "type"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_artifacts_job_type", "artifacts", type_="unique")
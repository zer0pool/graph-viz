"""create_job_node

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-06 12:45:07.366835+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = '0001'


def upgrade() -> None:
    op.create_table(
        "job_node",
        sa.Column("node_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(length=500), nullable=False),
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("owners", sa.JSON(), nullable=True),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("node_id"),
        sa.UniqueConstraint("job_id", name="uq_job_node_job_id"),
    )
    op.create_index(op.f("ix_job_node_job_id"), "job_node", ["job_id"], unique=True)
    op.create_index(op.f("ix_job_node_project_id"), "job_node", ["project_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_node_project_id"), table_name="job_node")
    op.drop_index(op.f("ix_job_node_job_id"), table_name="job_node")
    op.drop_table("job_node")
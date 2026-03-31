"""add_api_access_log

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_access_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("request_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=True),
        sa.Column("service", sa.String(length=20), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("path", sa.String(length=500), nullable=False),
        sa.Column("status_code", sa.SmallInteger(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_api_access_log_user_id", "api_access_log", ["user_id"])
    op.create_index("idx_api_access_log_path", "api_access_log", ["path"])
    op.create_index(
        "idx_api_access_log_requested_at", "api_access_log", ["requested_at"]
    )
    op.create_index(
        "idx_api_access_log_request_id", "api_access_log", ["request_id"]
    )


def downgrade() -> None:
    op.drop_index("idx_api_access_log_request_id", table_name="api_access_log")
    op.drop_index("idx_api_access_log_requested_at", table_name="api_access_log")
    op.drop_index("idx_api_access_log_path", table_name="api_access_log")
    op.drop_index("idx_api_access_log_user_id", table_name="api_access_log")
    op.drop_table("api_access_log")

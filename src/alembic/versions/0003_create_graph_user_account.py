"""Create graph_user_account table

Revision ID: 0003_create_graph_user_account
Revises: 0002_graph_edge_view
Create Date: 2025-03-04 00:00:00
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_create_graph_user_account"
down_revision: Union[str, None] = "0002_graph_edge_view"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "graph_user_account",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sub", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("picture", sa.String(length=512), nullable=True),
        sa.Column("preferred_username", sa.String(length=255), nullable=True),
        sa.Column("roles", sa.JSON(), nullable=True),
        sa.Column("dept", sa.String(length=255), nullable=True),
        sa.Column("locale", sa.String(length=32), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), server_default=sa.func.now(), server_onupdate=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), server_onupdate=sa.func.now()),
        sa.UniqueConstraint("sub", name="uq_graph_user_account_sub"),
        sa.Index("ix_graph_user_account_sub", "sub"),
        sa.Index("ix_graph_user_account_email", "email"),
    )


def downgrade() -> None:
    op.drop_index("ix_graph_user_account_email", table_name="graph_user_account")
    op.drop_index("ix_graph_user_account_sub", table_name="graph_user_account")
    op.drop_table("graph_user_account")

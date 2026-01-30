"""create_graph_user_account

Revision ID: 0002_create_graph_user_account
Revises: 0001_initial_graph_schema
Create Date: 2025-12-13 16:14:56.276349+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
# revision identifiers, used by Alembic.
revision: str = "0002_create_graph_user_account"
down_revision: Union[str, None] = "0001_initial_graph_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema and optionally migrate data."""
    op.create_table(
        "graph_user_account",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("sub", sa.String(length=255), nullable=True),
        sa.Column("loginId", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("roles", sa.JSON(), nullable=True),
        sa.Column("dept", sa.String(length=255), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_graph_user_account_loginId", "graph_user_account", ["loginId"], unique=True
    )


def downgrade() -> None:
    """Rollback changes made in the upgrade function."""
    op.drop_index("ix_graph_user_account_loginId", table_name="graph_user_account")
    op.drop_table("graph_user_account")

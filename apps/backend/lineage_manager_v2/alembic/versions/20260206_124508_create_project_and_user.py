"""create_project_and_user

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-06 12:45:08.926321+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. project
    op.create_table(
        "project",
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("business_unit", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="ACTIVE", nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("project_id"),
    )
    op.create_index(op.f("ix_project_business_unit"), "project", ["business_unit"], unique=False)
    op.create_index(op.f("ix_project_status"), "project", ["status"], unique=False)

    # 2. user_account
    op.create_table(
        "user_account",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sub", sa.String(length=255), nullable=False),
        sa.Column("login_id", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("roles", sa.JSON(), nullable=True),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="ACTIVE", nullable=True),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("login_id", name="uq_user_login_id"),
        sa.UniqueConstraint("sub", name="uq_user_sub"),
        sa.UniqueConstraint("user_id", name="uq_user_user_id"),
    )
    op.create_index(op.f("ix_user_account_email"), "user_account", ["email"], unique=False)
    op.create_index(op.f("ix_user_account_login_id"), "user_account", ["login_id"], unique=True)
    op.create_index(op.f("ix_user_account_sub"), "user_account", ["sub"], unique=True)
    op.create_index(op.f("ix_user_account_user_id"), "user_account", ["user_id"], unique=True)

    # 3. project_user (Association)
    op.create_table(
        "project_user",
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.project_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user_account.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
    )


def downgrade() -> None:
    op.drop_table("project_user")
    op.drop_index(op.f("ix_user_account_user_id"), table_name="user_account")
    op.drop_index(op.f("ix_user_account_sub"), table_name="user_account")
    op.drop_index(op.f("ix_user_account_login_id"), table_name="user_account")
    op.drop_index(op.f("ix_user_account_email"), table_name="user_account")
    op.drop_table("user_account")
    op.drop_index(op.f("ix_project_status"), table_name="project")
    op.drop_index(op.f("ix_project_business_unit"), table_name="project")
    op.drop_table("project")
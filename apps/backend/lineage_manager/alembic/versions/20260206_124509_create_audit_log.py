"""create_audit_log

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-06 12:45:09.506785+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("command_type", sa.String(length=100), nullable=False),
        sa.Column("target_id", sa.String(length=255), nullable=True),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("performed_by", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("visited_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_log_command_type"), "audit_log", ["command_type"], unique=False)
    op.create_index(op.f("ix_audit_log_performed_by"), "audit_log", ["performed_by"], unique=False)
    op.create_index(op.f("ix_audit_log_target_id"), "audit_log", ["target_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_log_target_id"), table_name="audit_log")
    op.drop_index(op.f("ix_audit_log_performed_by"), table_name="audit_log")
    op.drop_index(op.f("ix_audit_log_command_type"), table_name="audit_log")
    op.drop_table("audit_log")
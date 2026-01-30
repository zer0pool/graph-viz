"""add_meta_tables

Revision ID: 0003_add_meta_tables
Revises: 0002_create_graph_user_account
Create Date: 2026-01-27 11:36:00.000000+00:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_add_meta_tables"
down_revision: Union[str, None] = "0002_create_graph_user_account"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Meta layer tables for Project/User search functionality."""

    # 1. JOB_NODE - Job metadata for search and management
    op.create_table(
        "job_node",
        sa.Column("node_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("owner_id", sa.String(length=100), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("node_id"),
        sa.ForeignKeyConstraint(["node_id"], ["graph_node.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_job_project", "job_node", ["project_id"], unique=False)
    op.create_index("idx_job_owner", "job_node", ["owner_id"], unique=False)
    op.create_index(
        "idx_job_project_owner", "job_node", ["project_id", "owner_id"], unique=False
    )

    # 2. TABLE_NODE - Table metadata
    op.create_table(
        "table_node",
        sa.Column("node_id", sa.Integer(), nullable=False),
        sa.Column("dataset", sa.String(length=100), nullable=False),
        sa.Column("table_name", sa.String(length=100), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("node_id"),
        sa.ForeignKeyConstraint(["node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("dataset", "table_name", name="uq_dataset_table"),
    )
    op.create_index("idx_table_dataset", "table_node", ["dataset"])

    # 3. PROJECT - Project information
    op.create_table(
        "project",
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("business_unit", sa.String(length=100), nullable=True),
        sa.Column(
            "status", sa.String(length=20), server_default="ACTIVE", nullable=True
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("project_id"),
    )
    op.create_index("idx_project_business_unit", "project", ["business_unit"])
    op.create_index("idx_project_status", "project", ["status"])

    # 4. USER - User information (replaces IAM for local/test environments)
    op.create_table(
        "user",
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column(
            "status", sa.String(length=20), server_default="ACTIVE", nullable=True
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email", name="uq_user_email"),
    )
    op.create_index("idx_user_department", "user", ["department"])
    op.create_index("idx_user_status", "user", ["status"])

    # 5. PROJECT_USER - Project-User relationship
    op.create_table(
        "project_user",
        sa.Column("project_id", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.String(length=100), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
        sa.ForeignKeyConstraint(
            ["project_id"], ["project.project_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.user_id"], ondelete="CASCADE"),
    )
    op.create_index("idx_project_user_user", "project_user", ["user_id"])
    op.create_index("idx_project_user_project", "project_user", ["project_id"])


def downgrade() -> None:
    """Remove Meta layer tables."""

    # Drop in reverse order (foreign keys first)
    op.drop_table("project_user")
    op.drop_table("user")
    op.drop_table("project")
    op.drop_table("table_node")
    op.drop_table("job_node")

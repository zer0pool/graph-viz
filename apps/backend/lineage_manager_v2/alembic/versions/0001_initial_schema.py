"""initial_schema_v2

Revision ID: 0001
Revises: 
Create Date: 2026-03-03 23:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. graph_node
    op.create_table(
        "graph_node",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("node_type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("node_type", "name", name="uq_graph_node_type_name"),
    )

    # 2. graph_edge
    op.create_table(
        "graph_edge",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_node_id", sa.Integer(), nullable=False),
        sa.Column("target_node_id", sa.Integer(), nullable=False),
        sa.Column("edge_type", sa.String(length=20), nullable=False),
        sa.Column("trigger", sa.Boolean(), nullable=True, server_default=sa.text("0")),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_node_id", "target_node_id", "edge_type", name="uq_graph_edge_source_target_type"),
    )

    # 3. graph_closure
    op.create_table(
        "graph_closure",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("ancestor_id", sa.Integer(), nullable=False),
        sa.Column("descendant_id", sa.Integer(), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False),
        sa.Column("path", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ancestor_id", "descendant_id", "depth", name="uq_graph_closure"),
    )

    # 4. job_node
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

    # 5. data_node
    op.create_table(
        "data_node",
        sa.Column("node_id", sa.Integer(), nullable=False),
        sa.Column("data_id", sa.String(length=500), nullable=False),
        sa.Column("data_type", sa.String(length=50), nullable=False),
        sa.Column("data_info", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("node_id"),
        sa.UniqueConstraint("data_id", name="uq_data_node_data_id"),
    )
    op.create_index(op.f("ix_data_node_data_id"), "data_node", ["data_id"], unique=True)

    # 6. project
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

    # 7. user_account
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
        sa.UniqueConstraint("sub", name="uq_user_sub"),
        sa.UniqueConstraint("user_id", name="uq_user_user_id"),
    )
    op.create_index(op.f("ix_user_account_email"), "user_account", ["email"], unique=False)
    op.create_index(op.f("ix_user_account_login_id"), "user_account", ["login_id"], unique=True)
    op.create_index(op.f("ix_user_account_user_id"), "user_account", ["user_id"], unique=True)

    # 8. audit_log
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

    # 9. Create views
    op.execute("""
        CREATE VIEW v_table_node AS
        SELECT 
            node_id,
            data_id,
            data_info->>'$.project' AS project_name,
            data_info->>'$.dataset' AS dataset_name,
            data_info->>'$.table' AS table_name,
            data_info
        FROM data_node
        WHERE data_type = 'BIGQUERY'
    """)

    op.execute("""
        CREATE VIEW v_storage_node AS
        SELECT 
            node_id,
            data_id,
            data_type AS storage_type,
            data_info->>'$.bucket' AS bucket_name,
            data_info->>'$.prefix' AS object_key,
            data_info
        FROM data_node
        WHERE data_type IN ('S3', 'GCS')
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_storage_node")
    op.execute("DROP VIEW IF EXISTS v_table_node")
    op.drop_table("audit_log")
    op.drop_table("user_account")
    op.drop_table("project")
    op.drop_table("data_node")
    op.drop_table("job_node")
    op.drop_table("graph_closure")
    op.drop_table("graph_edge")
    op.drop_table("graph_node")

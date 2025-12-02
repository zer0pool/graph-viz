"""Initial graph tables

Revision ID: 0001_initial_graph_tables
Revises:
Create Date: 2025-11-09 01:20:00

"""

from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_graph_tables"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # graph_job_node
    op.create_table(
        "graph_job_node",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.String(length=255), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("owner", sa.String(length=100), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=True),
        sa.Column("write_mode", sa.String(length=20), nullable=True),
        sa.Column("destination_type", sa.String(length=20), nullable=True),
        sa.Column("destination_table", sa.String(length=500), nullable=True),
        sa.Column("trigger_tables", sa.JSON(), nullable=True),
        sa.Column("reference_tables", sa.JSON(), nullable=True),
        sa.Column("job_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # graph_table_node
    op.create_table(
        "graph_table_node",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("full_name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("project_name", sa.String(length=100), nullable=True),
        sa.Column("dataset_name", sa.String(length=100), nullable=True),
        sa.Column("table_name", sa.String(length=100), nullable=True),
        sa.Column("labels", sa.JSON(), nullable=True),
        sa.Column("storage_type", sa.String(length=50), nullable=True),
        sa.Column("storage_path", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # graph_job_table_link
    op.create_table(
        "graph_job_table_link",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("table_id", sa.Integer(), nullable=False),
        sa.Column("io_type", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("job_id", "table_id", "io_type", name="uq_job_table_io"),
    )

    # graph_edge
    op.create_table(
        "graph_edge",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_node_id", sa.Integer(), nullable=False),
        sa.Column("target_node_id", sa.Integer(), nullable=False),
        sa.Column("source_node_type", sa.String(length=10), nullable=False),
        sa.Column("target_node_type", sa.String(length=10), nullable=False),
        sa.Column("edge_type", sa.String(length=50), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=True),
        sa.Column(
            "is_trigger_on", sa.Boolean(), nullable=True, server_default=sa.text("true")
        ),
        sa.Column("source_job_id", sa.String(length=255), nullable=True),
        sa.Column("source_table_name", sa.String(length=255), nullable=True),
        sa.Column("target_job_id", sa.String(length=255), nullable=True),
        sa.Column("target_table_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "source_node_id", "target_node_id", "edge_type", name="uq_edge_relation"
        ),
    )

    # graph_closure
    op.create_table(
        "graph_closure",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ancestor_id", sa.Integer(), nullable=False),
        sa.Column("descendant_id", sa.Integer(), nullable=False),
        sa.Column("ancestor_type", sa.String(length=10), nullable=False),
        sa.Column("descendant_type", sa.String(length=10), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("path_info", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "ancestor_id", "descendant_id", "depth", name="uq_closure_path"
        ),
    )


def downgrade() -> None:
    op.drop_table("graph_closure")
    op.drop_table("graph_edge")
    op.drop_table("graph_job_table_link")
    op.drop_table("graph_table_node")
    op.drop_table("graph_job_node")

"""Initial unified graph schema

Revision ID: 0001_initial_graph_schema
Revises: 
Create Date: 2025-01-01 00:00:00
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial_graph_schema"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "graph_node",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("node_type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("node_type", "name", name="uq_graph_node_type_name"),
    )

    op.create_table(
        "graph_edge",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_node_id", sa.Integer(), nullable=False),
        sa.Column("target_node_id", sa.Integer(), nullable=False),
        sa.Column("edge_type", sa.String(length=20), nullable=False),
        sa.Column("dependency_type", sa.String(length=50), nullable=True),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "source_node_id",
            "target_node_id",
            "edge_type",
            name="uq_graph_edge_source_target_type",
        ),
        sa.ForeignKeyConstraint(["source_node_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_node_id"], ["graph_node.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "graph_closure",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ancestor_id", sa.Integer(), nullable=False),
        sa.Column("descendant_id", sa.Integer(), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("path", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("ancestor_id", "descendant_id", "depth", name="uq_graph_closure"),
        sa.ForeignKeyConstraint(["ancestor_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["descendant_id"], ["graph_node.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("graph_closure")
    op.drop_table("graph_edge")
    op.drop_table("graph_node")

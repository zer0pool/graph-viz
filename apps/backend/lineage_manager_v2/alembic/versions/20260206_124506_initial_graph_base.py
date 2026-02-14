"""initial_graph_base

Revision ID: 0001
Revises: 
Create Date: 2026-02-06 12:45:06.738588+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


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


def downgrade() -> None:
    op.drop_table("graph_closure")
    op.drop_table("graph_edge")
    op.drop_table("graph_node")
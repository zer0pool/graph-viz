"""Recreate graph tables to align with models

Revision ID: 0004_sync_graph_tables
Revises: 0003_create_graph_user_account
Create Date: 2025-03-05 00:00:00
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_sync_graph_tables"
down_revision: Union[str, None] = "0003_create_graph_user_account"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop dependent view first
    op.execute("DROP VIEW IF EXISTS graph_edge_view;")

    # Drop existing tables if they exist (development convenience)
    op.execute("DROP TABLE IF EXISTS graph_closure CASCADE;")
    op.execute("DROP TABLE IF EXISTS graph_edge CASCADE;")
    op.execute("DROP TABLE IF EXISTS graph_node CASCADE;")
    op.execute("DROP TABLE IF EXISTS graph_user_account CASCADE;")

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
            server_onupdate=sa.func.now(),
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
        sa.Column("is_trigger_on", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
            nullable=False,
        ),
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
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("ancestor_id", "descendant_id", "depth", name="uq_graph_closure"),
        sa.ForeignKeyConstraint(["ancestor_id"], ["graph_node.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["descendant_id"], ["graph_node.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "graph_user_account",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sub", sa.String(length=255), nullable=False, unique=True),
        sa.Column("email", sa.String(length=255), nullable=True, index=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("picture", sa.String(length=512), nullable=True),
        sa.Column("preferred_username", sa.String(length=255), nullable=True),
        sa.Column("roles", sa.JSON(), nullable=True),
        sa.Column("dept", sa.String(length=255), nullable=True),
        sa.Column("locale", sa.String(length=32), nullable=True),
        sa.Column(
            "last_login_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            server_onupdate=sa.func.now(),
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), server_onupdate=sa.func.now()
        ),
        sa.Index("ix_graph_user_account_email", "email"),
        sa.Index("ix_graph_user_account_sub", "sub"),
    )

    op.execute(
        """
        CREATE OR REPLACE VIEW graph_edge_view AS
        SELECT
            e.id AS edge_id,
            e.edge_type,
            e.is_trigger_on,
            e.source_node_id,
            src.node_type AS source_node_type,
            src.name AS source_name,
            e.target_node_id,
            tgt.node_type AS target_node_type,
            tgt.name AS target_name
        FROM graph_edge e
        JOIN graph_node src ON src.id = e.source_node_id
        JOIN graph_node tgt ON tgt.id = e.target_node_id;
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS graph_edge_view;")
    op.drop_table("graph_closure")
    op.drop_table("graph_edge")
    op.drop_table("graph_node")
    op.drop_table("graph_user_account")

    op.create_table(
        "graph_node",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("node_type", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("properties", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("node_type", "name", name="uq_graph_node_type_name"),
    )

    op.create_table(
        "graph_edge",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_node_id", sa.Integer(), nullable=False),
        sa.Column("target_node_id", sa.Integer(), nullable=False),
        sa.Column("edge_type", sa.String(length=20), nullable=False),
        sa.Column("is_trigger_on", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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

    op.execute(
        """
        CREATE OR REPLACE VIEW graph_edge_view AS
        SELECT
            e.id AS edge_id,
            e.edge_type,
            e.is_trigger_on,
            e.source_node_id,
            src.node_type AS source_node_type,
            src.name AS source_name,
            e.target_node_id,
            tgt.node_type AS target_node_type,
            tgt.name AS target_name
        FROM graph_edge e
        JOIN graph_node src ON src.id = e.source_node_id
        JOIN graph_node tgt ON tgt.id = e.target_node_id;
        """
    )

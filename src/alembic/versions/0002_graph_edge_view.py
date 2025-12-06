"""Create graph_edge_view for easier inspection

Revision ID: 0002_graph_edge_view
Revises: 0001_initial_graph_schema
Create Date: 2025-01-03 00:00:00
"""

from typing import Union

from alembic import op


# revision identifiers, used by Alembic
revision: str = "0002_graph_edge_view"
down_revision: Union[str, None] = "0001_initial_graph_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
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

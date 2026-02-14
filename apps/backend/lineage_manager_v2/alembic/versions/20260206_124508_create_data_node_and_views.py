"""create_data_node_and_views

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-06 12:45:08.127105+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = '0001'


def upgrade() -> None:
    # 1. Create data_node table
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

    # 2. Create v_table_node view
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

    # 3. Create v_storage_node view
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
    op.drop_index(op.f("ix_data_node_data_id"), table_name="data_node")
    op.drop_table("data_node")
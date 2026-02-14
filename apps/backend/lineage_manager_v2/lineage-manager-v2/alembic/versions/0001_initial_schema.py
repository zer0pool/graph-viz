"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-01-31 16:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- User Domain ---
    op.create_table('user_account',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_account_email'), 'user_account', ['email'], unique=True)

    # --- Graph Domain ---
    op.create_table('graph_node',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('node_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'node_type', name='uq_graph_node_name_type')
    )
    op.create_index(op.f('ix_graph_node_node_type'), 'graph_node', ['node_type'], unique=False)

    op.create_table('graph_edge',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('edge_type', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['graph_node.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_id'], ['graph_node.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_id', 'target_id', 'edge_type', name='uq_graph_edge_src_dst_type')
    )
    op.create_index(op.f('ix_graph_edge_source_id'), 'graph_edge', ['source_id'], unique=False)
    op.create_index(op.f('ix_graph_edge_target_id'), 'graph_edge', ['target_id'], unique=False)
    op.create_index('ix_graph_edge_target_source', 'graph_edge', ['target_id', 'source_id'], unique=False)

    # --- Job Domain (Leaf) ---
    op.create_table('job',
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.String(length=100), nullable=True),
        sa.Column('project_id', sa.String(length=100), nullable=True),
        sa.Column('schedule_interval', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['node_id'], ['graph_node.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('node_id')
    )
    op.create_index(op.f('ix_job_owner_id'), 'job', ['owner_id'], unique=False)
    op.create_index(op.f('ix_job_project_id'), 'job', ['project_id'], unique=False)

    # --- Table Domain (Leaf) ---
    op.create_table('table_metadata',
        sa.Column('node_id', sa.Integer(), nullable=False),
        sa.Column('dataset_name', sa.String(length=100), nullable=False),
        sa.Column('table_name', sa.String(length=100), nullable=False),
        sa.Column('schema_definition', sa.JSON(), nullable=True),
        sa.Column('storage_format', sa.String(length=50), nullable=True),
        sa.Column('location', sa.String(length=500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['node_id'], ['graph_node.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('node_id'),
        sa.UniqueConstraint('dataset_name', 'table_name', name='uq_table_dataset_name')
    )

    # --- Audit Domain ---
    op.create_table('audit_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_email', sa.String(length=255), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('target_type', sa.String(length=50), nullable=False),
        sa.Column('target_id', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_user_email'), 'audit_log', ['user_email'], unique=False)
    op.create_index(op.f('ix_audit_log_timestamp'), 'audit_log', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_log_timestamp'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_user_email'), table_name='audit_log')
    op.drop_table('audit_log')

    op.drop_table('table_metadata')

    op.drop_index(op.f('ix_job_project_id'), table_name='job')
    op.drop_index(op.f('ix_job_owner_id'), table_name='job')
    op.drop_table('job')

    op.drop_index('ix_graph_edge_target_source', table_name='graph_edge')
    op.drop_index(op.f('ix_graph_edge_target_id'), table_name='graph_edge')
    op.drop_index(op.f('ix_graph_edge_source_id'), table_name='graph_edge')
    op.drop_table('graph_edge')

    op.drop_index(op.f('ix_graph_node_node_type'), table_name='graph_node')
    op.drop_table('graph_node')

    op.drop_index(op.f('ix_user_account_email'), table_name='user_account')
    op.drop_table('user_account')

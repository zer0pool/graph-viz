"""create job and edge tables

Revision ID: 20251101_143000
Revises: 
Create Date: 2025-11-01 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '20251101_143000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial job and edge tables."""
    # Create job table
    op.create_table(
        'job',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='pending'),
        sa.Column('metadata', JSONB, nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), 
                 server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), 
                 server_default=sa.text('CURRENT_TIMESTAMP'),
                 onupdate=sa.text('CURRENT_TIMESTAMP')),
    )

    # Add indexes
    op.create_index('ix_job_status', 'job', ['status'])
    op.create_index('ix_job_created_at', 'job', ['created_at'])

    # Create edge table
    op.create_table(
        'edge',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('source_id', sa.String(50), nullable=False),
        sa.Column('target_id', sa.String(50), nullable=False),
        sa.Column('label', sa.String(100)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True),
                 server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['source_id'], ['job.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_id'], ['job.id'], ondelete='CASCADE'),
    )

    # Add indexes for edge lookups
    op.create_index('ix_edge_source_id', 'edge', ['source_id'])
    op.create_index('ix_edge_target_id', 'edge', ['target_id'])
    op.create_unique_constraint('uq_edge_source_target', 'edge', ['source_id', 'target_id'])


def downgrade() -> None:
    """Remove job and edge tables."""
    op.drop_table('edge')
    op.drop_table('job')
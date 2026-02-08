"""add_job_owner_table

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-08 02:15:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create table
    op.create_table(
        'job_owner',
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['graph_node.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user_account.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('job_id', 'user_id')
    )

    # 2. Migrate existing data from JSON properties to job_owner table
    # This is a bit complex for a migration but good for consistency.
    # We select all jobs and their properties.
    connection = op.get_bind()
    
    # Query for all job nodes with owners
    # NOTE: Using a raw SQL because we can't easily parse JSON via SA in all dialects here.
    # This works for MySQL.
    rows = connection.execute(
        sa.text("SELECT id, properties FROM graph_node WHERE node_type = 'job'")
    ).fetchall()

    import json
    for job_id, props_json in rows:
        if not props_json:
            continue
        
        try:
            if isinstance(props_json, str):
                props = json.loads(props_json)
            else:
                props = props_json
                
            owners = props.get('owners', [])
            if isinstance(owners, list):
                for uid in owners:
                    if uid:
                        # Insert ignores duplicates if they exist, but here we just insert.
                        # We use sa.text to avoid SA model issues in migrations.
                        connection.execute(
                            sa.text("INSERT INTO job_owner (job_id, user_id) VALUES (:job_id, :user_id)"),
                            {"job_id": job_id, "user_id": uid}
                        )
        except Exception:
            # Skip rows with malformed JSON
            pass


def downgrade() -> None:
    op.drop_table('job_owner')

"""unify_user_and_auth_tables

Revision ID: 62aa20cf5576
Revises: 0003_add_meta_tables
Create Date: 2026-01-27 06:49:52.622005+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_unify_user_and_auth_tables'
down_revision: Union[str, None] = '0003_add_meta_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename graph_user_account to user_account
    op.rename_table('graph_user_account', 'user_account')

    # 2. Standardize column names in user_account
    op.alter_column('user_account', 'loginId', new_column_name='login_id', type_=sa.String(255), existing_type=sa.String(255), nullable=True)
    op.alter_column('user_account', 'dept', new_column_name='department', type_=sa.String(255), existing_type=sa.String(255), nullable=True)

    # 3. Add status column to user_account
    op.add_column('user_account', sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=True))
    op.create_index(op.f('ix_user_account_status'), 'user_account', ['status'], unique=False)

    # 4. Handle user_id (Adding it as a new column for now)
    op.add_column('user_account', sa.Column('user_id', sa.String(length=100), nullable=True))
    
    # Data migration: Populating user_id from email or sub
    op.execute("UPDATE user_account SET user_id = COALESCE(email, sub)")
    
    # Make user_id non-nullable and unique
    op.alter_column('user_account', 'user_id', nullable=False)
    op.create_index(op.f('ix_user_account_user_id'), 'user_account', ['user_id'], unique=True)

    # 5. Drop the old 'user' table
    # But first, drop FKs from project_user that point to 'user'
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'project_user' in inspector.get_table_names():
        for fk in inspector.get_foreign_keys('project_user'):
            if fk['referred_table'] == 'user':
                op.drop_constraint(fk['name'], 'project_user', type_='foreignkey')

    op.drop_table('user')


def downgrade() -> None:
    # 1. Recreate 'user' table
    op.create_table('user',
        sa.Column('user_id', sa.String(100), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), server_default='ACTIVE', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False)
    )

    # 2. Revert user_account changes
    op.drop_index(op.f('ix_user_account_user_id'), table_name='user_account')
    op.drop_index(op.f('ix_user_account_status'), table_name='user_account')
    op.drop_column('user_account', 'status')
    op.drop_column('user_account', 'user_id')
    op.alter_column('user_account', 'login_id', new_column_name='loginId', type_=sa.String(255))
    op.alter_column('user_account', 'department', new_column_name='dept', type_=sa.String(255))
    
    # 3. Rename back to graph_user_account
    op.rename_table('user_account', 'graph_user_account')

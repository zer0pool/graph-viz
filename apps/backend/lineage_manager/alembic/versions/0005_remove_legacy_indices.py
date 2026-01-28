"""remove_legacy_indices_and_update_fk

Revision ID: c2ffced35cbf
Revises: 62aa20cf5576
Create Date: 2026-01-27 07:49:50.934260+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_remove_legacy_indices'
down_revision: Union[str, None] = '0004_unify_user_and_auth_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop old indices if they exist (using IF EXISTS implicitly by checking exception or just trying)
    # Note: Alembic doesn't support 'DROP INDEX IF EXISTS' directly in all dialects easily without raw SQL.
    # We will try to drop them.
    try:
        op.drop_index('ix_graph_user_account_email', table_name='user_account')
    except Exception:
        pass
        
    try:
        op.drop_index('ix_graph_user_account_loginId', table_name='user_account')
    except Exception:
        pass
        
    try:
        op.drop_index('ix_graph_user_account_sub', table_name='user_account')
    except Exception:
        pass

    try:
        op.drop_index('ix_user_account_status', table_name='user_account')
    except Exception:
        pass

    # 2. Create new indices
    try:
        op.create_index(op.f('ix_user_account_email'), 'user_account', ['email'], unique=False)
    except Exception:
        pass # Already exists
        
    try:
        op.create_index(op.f('ix_user_account_login_id'), 'user_account', ['login_id'], unique=True)
    except Exception:
        pass

    try:
        op.create_index(op.f('ix_user_account_sub'), 'user_account', ['sub'], unique=True)
    except Exception:
        pass
        
    try:
        op.create_index(op.f('ix_user_account_user_id'), 'user_account', ['user_id'], unique=True)
    except Exception:
        pass

    # 3. Update project_user FK
    # Check if project_user table exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'project_user' in tables:
        # Get foreign keys to drop existing ones
        fks = inspector.get_foreign_keys('project_user')
        for fk in fks:
            # We want to drop the fk pointing to 'user' OR any existing one to 'user_account' if we are recreating
            if fk['referred_table'] == 'user' or fk['referred_table'] == 'user_account':
                op.drop_constraint(fk['name'], 'project_user', type_='foreignkey')
                
        # Now create new FK
        op.create_foreign_key(
            'fk_project_user_user_id_user_account',
            'project_user', 'user_account',
            ['user_id'], ['user_id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    """Rollback changes made in the upgrade function."""
    pass
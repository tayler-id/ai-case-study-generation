"""Add OAuth token fields for Gmail and Drive connections

Revision ID: 002_add_oauth_token_fields
Revises: 001_create_users_table
Create Date: 2025-01-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_oauth_token_fields'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """Add OAuth token fields to users table for Gmail and Drive API access"""
    
    # Add Gmail OAuth token fields
    op.add_column('users', sa.Column('gmail_access_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('gmail_refresh_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('gmail_token_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('gmail_connected_at', sa.DateTime(), nullable=True))
    
    # Add Google Drive OAuth token fields
    op.add_column('users', sa.Column('drive_access_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('drive_refresh_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('drive_token_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('drive_connected_at', sa.DateTime(), nullable=True))


def downgrade():
    """Remove OAuth token fields from users table"""
    
    # Remove Gmail OAuth token fields
    op.drop_column('users', 'gmail_access_token')
    op.drop_column('users', 'gmail_refresh_token')
    op.drop_column('users', 'gmail_token_expires_at')
    op.drop_column('users', 'gmail_connected_at')
    
    # Remove Google Drive OAuth token fields
    op.drop_column('users', 'drive_access_token')
    op.drop_column('users', 'drive_refresh_token')
    op.drop_column('users', 'drive_token_expires_at')
    op.drop_column('users', 'drive_connected_at')
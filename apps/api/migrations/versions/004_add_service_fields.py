"""Add service credentials and connections fields

Revision ID: 004
Revises: 003
Create Date: 2025-01-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    """Add new flexible service fields to user table"""
    
    # Add service_credentials JSON field for storing all service tokens
    op.add_column('user', sa.Column(
        'service_credentials', 
        postgresql.JSON(astext_type=sa.Text()), 
        nullable=True,
        comment='JSON storage for all service credentials'
    ))
    
    # Add service_connections JSON field for storing connection metadata
    op.add_column('user', sa.Column(
        'service_connections', 
        postgresql.JSON(astext_type=sa.Text()), 
        nullable=True,
        comment='JSON storage for service connection metadata'
    ))
    
    print("✅ Added flexible service credential fields to user table")


def downgrade():
    """Remove service fields (for rollback)"""
    
    op.drop_column('user', 'service_connections')
    op.drop_column('user', 'service_credentials')
    
    print("❌ Removed flexible service credential fields from user table")
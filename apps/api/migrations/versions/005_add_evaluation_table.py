"""Add case study evaluation table

Revision ID: 005
Revises: 004
Create Date: 2025-01-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    """Add case study evaluation table"""
    
    op.create_table('case_study_evaluations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_study_id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('accuracy_rating', sa.Integer(), nullable=True),
        sa.Column('usefulness_rating', sa.Integer(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['case_study_id'], ['case_studies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('accuracy_rating >= 1 AND accuracy_rating <= 5', name='accuracy_rating_range'),
        sa.CheckConstraint('usefulness_rating >= 1 AND usefulness_rating <= 5', name='usefulness_rating_range')
    )
    
    # Create index for efficient lookups
    op.create_index('ix_case_study_evaluations_case_study_id', 'case_study_evaluations', ['case_study_id'])
    op.create_index('ix_case_study_evaluations_user_id', 'case_study_evaluations', ['user_id'])
    
    # Create unique constraint to prevent duplicate evaluations per user per case study
    op.create_index(
        'ix_case_study_evaluations_unique_user_case',
        'case_study_evaluations',
        ['case_study_id', 'user_id'],
        unique=True
    )
    
    print("✅ Added case_study_evaluations table with constraints and indexes")


def downgrade():
    """Remove case study evaluation table"""
    
    op.drop_index('ix_case_study_evaluations_unique_user_case', table_name='case_study_evaluations')
    op.drop_index('ix_case_study_evaluations_user_id', table_name='case_study_evaluations')
    op.drop_index('ix_case_study_evaluations_case_study_id', table_name='case_study_evaluations')
    op.drop_table('case_study_evaluations')
    
    print("❌ Removed case_study_evaluations table")
"""Add case study models

Revision ID: 003
Revises: 002
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003'
down_revision = '002_add_oauth_token_fields'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create case_studies table
    op.create_table('case_studies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_name', sa.String(length=200), nullable=False),
        sa.Column('project_industry', sa.String(length=100), nullable=True),
        sa.Column('project_focus', sa.String(length=200), nullable=True),
        sa.Column('template_type', sa.Enum('comprehensive', 'technical', 'marketing', 'product', name='casestudytemplate'), nullable=False),
        sa.Column('model_used', sa.String(length=50), nullable=False),
        sa.Column('custom_instructions', sa.Text(), nullable=True),
        sa.Column('date_range_start', sa.DateTime(), nullable=False),
        sa.Column('date_range_end', sa.DateTime(), nullable=False),
        sa.Column('participants', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('keywords', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.Enum('pending', 'generating', 'completed', 'failed', 'cancelled', name='casestudystatus'), nullable=False),
        sa.Column('progress_percentage', sa.Integer(), nullable=False),
        sa.Column('current_section', sa.String(length=100), nullable=True),
        sa.Column('full_content', sa.Text(), nullable=True),
        sa.Column('executive_summary', sa.Text(), nullable=True),
        sa.Column('key_insights', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('recommendations', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('generation_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_studies_user_id'), 'case_studies', ['user_id'], unique=False)
    op.create_index(op.f('ix_case_studies_created_at'), 'case_studies', ['created_at'], unique=False)
    op.create_index(op.f('ix_case_studies_status'), 'case_studies', ['status'], unique=False)

    # Create case_study_sections table
    op.create_table('case_study_sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_study_id', sa.Integer(), nullable=False),
        sa.Column('section_name', sa.String(length=100), nullable=False),
        sa.Column('section_order', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['case_study_id'], ['case_studies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_study_sections_case_study_id'), 'case_study_sections', ['case_study_id'], unique=False)

def downgrade() -> None:
    # Drop case_study_sections table
    op.drop_index(op.f('ix_case_study_sections_case_study_id'), table_name='case_study_sections')
    op.drop_table('case_study_sections')
    
    # Drop case_studies table
    op.drop_index(op.f('ix_case_studies_status'), table_name='case_studies')
    op.drop_index(op.f('ix_case_studies_created_at'), table_name='case_studies')
    op.drop_index(op.f('ix_case_studies_user_id'), table_name='case_studies')
    op.drop_table('case_studies')
    
    # Drop enums
    sa.Enum(name='casestudytemplate').drop(op.get_bind())
    sa.Enum(name='casestudystatus').drop(op.get_bind())
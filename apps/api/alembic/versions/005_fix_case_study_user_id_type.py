"""Fix case study user_id column type

Revision ID: 005_fix_case_study_user_id_type
Revises: 004_add_service_fields
Create Date: 2024-07-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005_fix_case_study_user_id_type'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # First, let's try to find and drop any existing foreign key constraint on user_id
    conn = op.get_bind()
    result = conn.execute(sa.text("""
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'case_studies' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    """))
    
    for row in result:
        constraint_name = row[0]
        op.drop_constraint(constraint_name, 'case_studies', type_='foreignkey')
    
    # Change the column type from Integer to UUID
    op.alter_column('case_studies', 'user_id',
                    type_=postgresql.UUID(),
                    postgresql_using='user_id::text::uuid')
    
    # Recreate the foreign key constraint  
    op.create_foreign_key('fk_case_studies_user_id_users', 'case_studies', 'user', ['user_id'], ['id'])


def downgrade():
    # Drop the foreign key constraint
    op.drop_constraint('fk_case_studies_user_id_users', 'case_studies', type_='foreignkey')
    
    # Change the column type back from UUID to Integer
    op.alter_column('case_studies', 'user_id',
                    type_=sa.Integer(),
                    postgresql_using='user_id::text::integer')
    
    # Recreate the foreign key constraint
    op.create_foreign_key('fk_case_studies_user_id_users', 'case_studies', 'user', ['user_id'], ['id'])
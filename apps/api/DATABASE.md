# Database Setup Guide

This guide explains how to set up and manage the PostgreSQL database for the Case Study Application.

## Prerequisites

1. **PostgreSQL**: Install PostgreSQL 12+ on your system
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Python Dependencies**: All required packages are in `requirements.txt`
   ```bash
   pip install -r requirements.txt
   ```

## Database Configuration

### 1. Create Database

Connect to PostgreSQL and create the database:

```sql
-- Connect as postgres user
psql -U postgres

-- Create database
CREATE DATABASE casestudies;

-- Create user (optional, for production)
CREATE USER casestudies_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE casestudies TO casestudies_user;
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Update `.env` with your database credentials:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/casestudies
```

For development, you can also use SQLite:
```env
DATABASE_URL=sqlite:///./test.db
```

### 3. Initialize Database

Use the database management script:

```bash
# Check database connection
python manage_db.py check

# Initialize database with tables
python manage_db.py init

# Or run migrations
python manage_db.py migrate
```

## Database Schema

### Users Table

The main table for storing authenticated user information:

- `id` (UUID): Primary key, auto-generated
- `google_id` (String): Google OAuth unique identifier
- `email` (String): User's email address (unique)
- `name` (String): User's full name
- `avatar_url` (String, optional): URL to user's profile picture
- `created_at` (DateTime): Account creation timestamp
- `updated_at` (DateTime): Last update timestamp

## Database Management

### Using the Management Script

The `manage_db.py` script provides convenient commands:

```bash
# Check connection
python manage_db.py check

# Initialize fresh database
python manage_db.py init

# Run migrations
python manage_db.py migrate

# Create new migration
python manage_db.py create-migration -m "Add new table"

# Check current database version
python manage_db.py status
```

### Using Alembic Directly

You can also use Alembic commands directly:

```bash
# Generate migration
alembic revision --autogenerate -m "Migration message"

# Run migrations
alembic upgrade head

# Downgrade migration
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history
```

## Development Workflow

### 1. Model Changes

When you modify SQLModel classes:

1. Create migration:
   ```bash
   python manage_db.py create-migration -m "Describe your changes"
   ```

2. Review the generated migration file in `alembic/versions/`

3. Run migration:
   ```bash
   python manage_db.py migrate
   ```

### 2. Database Reset

For development, you might need to reset the database:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS casestudies;"
psql -U postgres -c "CREATE DATABASE casestudies;"

# Reinitialize
python manage_db.py init
```

## Production Deployment

### Environment Variables

Set these environment variables in production:

- `DATABASE_URL`: Full PostgreSQL connection string
- `JWT_SECRET_KEY`: Secure random string for JWT signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Migration Strategy

1. Always test migrations on a copy of production data
2. Run migrations during maintenance windows
3. Keep database backups before major changes
4. Use Alembic's revision system for version control

### Connection Pooling

The application uses SQLAlchemy's connection pooling:

- Pool size: 10 connections
- Max overflow: 20 additional connections
- Connection recycling: Every 5 minutes
- Pre-ping: Validates connections before use

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL format
   - Check firewall settings

2. **Authentication Failed**
   - Verify username/password in DATABASE_URL
   - Check PostgreSQL user permissions

3. **Migration Errors**
   - Check current database state with `alembic current`
   - Review migration files for conflicts
   - Consider manual database fixes for complex migrations

### Logging

Enable SQL query logging by setting `DEBUG=true` in your environment file. This will log all database queries for debugging.

## Security Considerations

1. **Database Credentials**: Never commit `.env` files with real credentials
2. **Connection Encryption**: Use SSL in production
3. **User Permissions**: Follow principle of least privilege
4. **Regular Backups**: Implement automated backup strategy
5. **Monitoring**: Set up database monitoring and alerting

## Testing

For testing, the application can use SQLite in-memory databases:

```python
# In test configuration
DATABASE_URL=sqlite:///:memory:
```

This provides isolated, fast tests without affecting the main database.
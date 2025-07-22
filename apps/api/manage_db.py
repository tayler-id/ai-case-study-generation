#!/usr/bin/env python3
"""
Database Management Script
Provides CLI commands for database operations like migrations, initialization, etc.
"""

import sys
import os
import logging
from typing import Optional
import argparse

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(__file__))

from database import init_database, check_database_connection, get_db_session
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_db():
    """Initialize the database with tables"""
    logger.info("Initializing database...")
    try:
        init_database()
        logger.info("Database initialized successfully!")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        sys.exit(1)

def check_connection():
    """Check database connection"""
    logger.info("Checking database connection...")
    if check_database_connection():
        logger.info("Database connection successful!")
    else:
        logger.error("Database connection failed!")
        sys.exit(1)

def create_migration(name: Optional[str] = None):
    """Create a new migration"""
    import subprocess
    
    if not name:
        name = input("Enter migration name: ")
    
    try:
        # Run alembic revision command
        cmd = ["python", "-m", "alembic", "revision", "--autogenerate", "-m", name]
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Migration created successfully!")
            if result.stdout:
                logger.info(result.stdout)
        else:
            logger.error(f"Migration creation failed: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Error creating migration: {e}")
        sys.exit(1)

def run_migrations():
    """Run all pending migrations"""
    import subprocess
    
    try:
        # Run alembic upgrade command
        cmd = ["python", "-m", "alembic", "upgrade", "head"]
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("Migrations completed successfully!")
            if result.stdout:
                logger.info(result.stdout)
        else:
            logger.error(f"Migrations failed: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        sys.exit(1)

def show_current_revision():
    """Show current database revision"""
    import subprocess
    
    try:
        # Run alembic current command
        cmd = ["python", "-m", "alembic", "current"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Current revision: {result.stdout.strip()}")
        else:
            logger.error(f"Error getting current revision: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Error checking revision: {e}")

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Database Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize database with tables")
    
    # Check connection command
    check_parser = subparsers.add_parser("check", help="Check database connection")
    
    # Migration commands
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")
    create_parser = subparsers.add_parser("create-migration", help="Create new migration")
    create_parser.add_argument("-m", "--message", help="Migration message")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Show current database revision")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    logger.info(f"Database URL: {settings.database_url}")
    
    if args.command == "init":
        init_db()
    elif args.command == "check":
        check_connection()
    elif args.command == "migrate":
        run_migrations()
    elif args.command == "create-migration":
        create_migration(args.message)
    elif args.command == "status":
        show_current_revision()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
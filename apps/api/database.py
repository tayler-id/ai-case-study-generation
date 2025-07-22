"""
Database Configuration and Connection Management
Provides database engine, session management, and initialization utilities
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
import logging

from config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create database engine with connection pooling
engine = create_engine(
    settings.database_url,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    echo=settings.debug  # Log SQL queries in debug mode
)

def create_db_and_tables():
    """
    Create database tables from SQLModel definitions
    Should be called during application startup
    """
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

def get_session() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI
    Yields a database session that automatically closes after use
    """
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions
    Use this for manual database operations outside of FastAPI dependencies
    """
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database transaction error: {e}")
            raise
        finally:
            session.close()

def check_database_connection() -> bool:
    """
    Check if database connection is working
    Returns True if connection is successful, False otherwise
    """
    try:
        with Session(engine) as session:
            from sqlalchemy import text
            session.exec(text("SELECT 1"))
        logger.info("Database connection check successful")
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False

def init_database():
    """
    Initialize database with tables and verify connection
    Should be called during application startup
    """
    logger.info("Initializing database...")
    
    # Check connection first
    if not check_database_connection():
        raise Exception("Failed to connect to database")
    
    # Create tables
    create_db_and_tables()
    
    logger.info("Database initialization completed successfully")
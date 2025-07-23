"""
User Repository
Data access layer for User operations following Repository Pattern
"""

from typing import Optional
from sqlmodel import Session, select
import logging
from models.user import User

logger = logging.getLogger(__name__)

class UserRepository:
    """Repository for User data access operations"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by UUID"""
        try:
            statement = select(User).where(User.id == user_id)
            return self.session.exec(statement).first()
        except Exception:
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        try:
            statement = select(User).where(User.email == email)
            return self.session.exec(statement).first()
        except Exception:
            return None
    
    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by Google ID"""
        try:
            statement = select(User).where(User.google_id == google_id)
            return self.session.exec(statement).first()
        except Exception:
            return None
    
    def create_user(self, google_id: str, email: str, name: str, avatar_url: Optional[str] = None) -> User:
        """Create a new user record"""
        try:
            # Ensure clean transaction state
            self.session.rollback()  # Clear any aborted transaction
            
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                avatar_url=avatar_url
            )
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            logger.info(f"Created new user with email: {email}")
            return user
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to create user with email {email}: {str(e)}")
            raise
    
    def update_user(self, user: User) -> User:
        """Update existing user record"""
        try:
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            logger.info(f"Updated user with email: {user.email}")
            return user
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to update user with email {user.email}: {str(e)}")
            raise
    
    def find_or_create_user(self, google_id: str, email: str, name: str, avatar_url: Optional[str] = None) -> User:
        """Find existing user or create new one"""
        try:
            # Ensure clean state
            self.session.rollback()
            
            # Try to find by Google ID first
            user = self.get_user_by_google_id(google_id)
            
            if user:
                # Update user info in case it changed
                user.email = email
                user.name = name
                user.avatar_url = avatar_url
                return self.update_user(user)
            else:
                # Create new user
                return self.create_user(google_id, email, name, avatar_url)
        except Exception as e:
            # Rollback the transaction on error
            self.session.rollback()
            logger.error(f"find_or_create_user failed for google_id {google_id}: {str(e)}")
            raise e
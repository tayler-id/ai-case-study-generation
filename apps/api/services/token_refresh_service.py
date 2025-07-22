"""
OAuth Token Refresh Service
Handles refreshing expired OAuth tokens for Google services
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from sqlmodel import Session

from models.user import User
from repositories.user_repository import UserRepository
from config import settings


class TokenRefreshService:
    """Service for managing and refreshing OAuth tokens"""
    
    def __init__(self, session: Session):
        """Initialize with database session"""
        self.session = session
        self.user_repo = UserRepository(session)
    
    def refresh_gmail_token(self, user: User) -> bool:
        """
        Refresh Gmail OAuth token if needed
        
        Args:
            user: User object with Gmail tokens
            
        Returns:
            True if token was refreshed successfully, False otherwise
        """
        if not user.is_gmail_connected:
            return False
        
        # Check if token is expired or will expire soon (within 5 minutes)
        if not self._is_token_expired_or_expiring_soon(user.gmail_token_expires_at):
            return True  # Token is still valid
        
        try:
            # Create credentials object
            credentials = self._create_credentials(
                access_token=user.gmail_access_token,
                refresh_token=user.gmail_refresh_token
            )
            
            # Refresh the token
            credentials.refresh(Request())
            
            # Update user tokens
            user.gmail_access_token = credentials.token
            if credentials.expiry:
                user.gmail_token_expires_at = credentials.expiry.replace(tzinfo=None)
            user.updated_at = datetime.utcnow()
            
            # Save to database
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            
            return True
            
        except Exception as e:
            print(f"Failed to refresh Gmail token for user {user.id}: {str(e)}")
            return False
    
    def refresh_drive_token(self, user: User) -> bool:
        """
        Refresh Google Drive OAuth token if needed
        
        Args:
            user: User object with Drive tokens
            
        Returns:
            True if token was refreshed successfully, False otherwise
        """
        if not user.is_drive_connected:
            return False
        
        # Check if token is expired or will expire soon (within 5 minutes)
        if not self._is_token_expired_or_expiring_soon(user.drive_token_expires_at):
            return True  # Token is still valid
        
        try:
            # Create credentials object
            credentials = self._create_credentials(
                access_token=user.drive_access_token,
                refresh_token=user.drive_refresh_token
            )
            
            # Refresh the token
            credentials.refresh(Request())
            
            # Update user tokens
            user.drive_access_token = credentials.token
            if credentials.expiry:
                user.drive_token_expires_at = credentials.expiry.replace(tzinfo=None)
            user.updated_at = datetime.utcnow()
            
            # Save to database
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            
            return True
            
        except Exception as e:
            print(f"Failed to refresh Drive token for user {user.id}: {str(e)}")
            return False
    
    def refresh_all_user_tokens(self, user: User) -> Dict[str, bool]:
        """
        Refresh all OAuth tokens for a user
        
        Args:
            user: User object
            
        Returns:
            Dictionary with service names and refresh success status
        """
        results = {}
        
        if user.is_gmail_connected:
            results['gmail'] = self.refresh_gmail_token(user)
        
        if user.is_drive_connected:
            results['drive'] = self.refresh_drive_token(user)
        
        return results
    
    def get_user_with_refreshed_tokens(self, user_id: str) -> Optional[User]:
        """
        Get user and ensure all tokens are refreshed
        
        Args:
            user_id: User ID
            
        Returns:
            User object with refreshed tokens, or None if user not found
        """
        user = self.user_repo.get_user_by_id(user_id)
        if not user:
            return None
        
        # Refresh tokens if needed
        self.refresh_all_user_tokens(user)
        
        # Return updated user
        self.session.refresh(user)
        return user
    
    def validate_and_refresh_service_token(self, user: User, service: str) -> bool:
        """
        Validate and refresh token for a specific service
        
        Args:
            user: User object
            service: Service name ('gmail' or 'drive')
            
        Returns:
            True if token is valid/refreshed, False if service not connected or refresh failed
        """
        if service == 'gmail':
            return self.refresh_gmail_token(user)
        elif service == 'drive':
            return self.refresh_drive_token(user)
        else:
            raise ValueError(f"Unsupported service: {service}")
    
    def _create_credentials(self, access_token: str, refresh_token: str) -> Credentials:
        """Create Google OAuth credentials object"""
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret
        )
    
    def _is_token_expired_or_expiring_soon(
        self, 
        expires_at: Optional[datetime], 
        buffer_minutes: int = 5
    ) -> bool:
        """
        Check if token is expired or will expire soon
        
        Args:
            expires_at: Token expiration datetime
            buffer_minutes: Minutes before expiration to consider as "expiring soon"
            
        Returns:
            True if token is expired or expiring soon
        """
        if not expires_at:
            return True  # No expiration time means we should refresh
        
        now = datetime.utcnow()
        buffer_time = timedelta(minutes=buffer_minutes)
        
        return now >= (expires_at - buffer_time)
    
    def get_token_status(self, user: User) -> Dict[str, Any]:
        """
        Get status of all OAuth tokens for a user
        
        Args:
            user: User object
            
        Returns:
            Dictionary with token status information
        """
        now = datetime.utcnow()
        
        gmail_status = {
            'connected': user.is_gmail_connected,
            'expired': user.gmail_token_expired if user.is_gmail_connected else None,
            'expires_at': user.gmail_token_expires_at.isoformat() if user.gmail_token_expires_at else None,
            'expires_in_minutes': None
        }
        
        if user.gmail_token_expires_at:
            delta = user.gmail_token_expires_at - now
            gmail_status['expires_in_minutes'] = int(delta.total_seconds() / 60)
        
        drive_status = {
            'connected': user.is_drive_connected,
            'expired': user.drive_token_expired if user.is_drive_connected else None,
            'expires_at': user.drive_token_expires_at.isoformat() if user.drive_token_expires_at else None,
            'expires_in_minutes': None
        }
        
        if user.drive_token_expires_at:
            delta = user.drive_token_expires_at - now
            drive_status['expires_in_minutes'] = int(delta.total_seconds() / 60)
        
        return {
            'user_id': str(user.id),
            'gmail': gmail_status,
            'drive': drive_status,
            'last_updated': now.isoformat()
        }
    
    def cleanup_expired_tokens(self, user: User) -> Dict[str, bool]:
        """
        Clean up tokens that have been expired for more than a certain period
        
        Args:
            user: User object
            
        Returns:
            Dictionary indicating which tokens were cleaned up
        """
        cleaned_up = {'gmail': False, 'drive': False}
        now = datetime.utcnow()
        cleanup_threshold = timedelta(days=30)  # Clean up tokens expired for more than 30 days
        
        # Check Gmail token
        if (user.is_gmail_connected and 
            user.gmail_token_expires_at and 
            now - user.gmail_token_expires_at > cleanup_threshold):
            
            user.gmail_access_token = None
            user.gmail_refresh_token = None
            user.gmail_token_expires_at = None
            user.gmail_connected_at = None
            cleaned_up['gmail'] = True
        
        # Check Drive token
        if (user.is_drive_connected and 
            user.drive_token_expires_at and 
            now - user.drive_token_expires_at > cleanup_threshold):
            
            user.drive_access_token = None
            user.drive_refresh_token = None
            user.drive_token_expires_at = None
            user.drive_connected_at = None
            cleaned_up['drive'] = True
        
        # Save changes if any cleanup was performed
        if cleaned_up['gmail'] or cleaned_up['drive']:
            user.updated_at = now
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
        
        return cleaned_up
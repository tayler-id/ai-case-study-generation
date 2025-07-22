"""
User data model
Based on Architecture Document specifications
"""

from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class User(SQLModel, table=True):
    """User model for storing authenticated user information"""
    
    # Primary key - UUID for better security
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Google OAuth fields
    google_id: str = Field(unique=True, index=True, description="Google's unique ID for the user")
    
    # User profile information
    email: str = Field(unique=True, index=True, description="User's email address")
    name: str = Field(description="User's full name from Google")
    avatar_url: Optional[str] = Field(default=None, description="URL to user's Google profile picture")
    
    # OAuth token storage for Gmail API access
    gmail_access_token: Optional[str] = Field(default=None, description="Encrypted Gmail access token")
    gmail_refresh_token: Optional[str] = Field(default=None, description="Encrypted Gmail refresh token")
    gmail_token_expires_at: Optional[datetime] = Field(default=None, description="Gmail token expiration timestamp")
    gmail_connected_at: Optional[datetime] = Field(default=None, description="Gmail connection timestamp")
    
    # OAuth token storage for Google Drive API access
    drive_access_token: Optional[str] = Field(default=None, description="Encrypted Drive access token")
    drive_refresh_token: Optional[str] = Field(default=None, description="Encrypted Drive refresh token")
    drive_token_expires_at: Optional[datetime] = Field(default=None, description="Drive token expiration timestamp")
    drive_connected_at: Optional[datetime] = Field(default=None, description="Drive connection timestamp")
    
    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="User creation timestamp")
    updated_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
        description="Last update timestamp"
    )
    
    @property
    def is_gmail_connected(self) -> bool:
        """Check if Gmail is connected and tokens are valid"""
        return (
            self.gmail_access_token is not None 
            and self.gmail_refresh_token is not None
            and self.gmail_connected_at is not None
        )
    
    @property
    def is_drive_connected(self) -> bool:
        """Check if Google Drive is connected and tokens are valid"""
        return (
            self.drive_access_token is not None 
            and self.drive_refresh_token is not None
            and self.drive_connected_at is not None
        )
    
    @property
    def gmail_token_expired(self) -> bool:
        """Check if Gmail token is expired"""
        if not self.gmail_token_expires_at:
            return True
        return datetime.utcnow() >= self.gmail_token_expires_at
    
    @property
    def drive_token_expired(self) -> bool:
        """Check if Drive token is expired"""
        if not self.drive_token_expires_at:
            return True
        return datetime.utcnow() >= self.drive_token_expires_at
"""
User data model
Based on Architecture Document specifications
"""

from typing import Optional, List
from sqlmodel import Field, SQLModel, JSON, Column
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
    
    # Legacy OAuth token storage (kept for backward compatibility)
    gmail_access_token: Optional[str] = Field(default=None, description="Encrypted Gmail access token")
    gmail_refresh_token: Optional[str] = Field(default=None, description="Encrypted Gmail refresh token")
    gmail_token_expires_at: Optional[datetime] = Field(default=None, description="Gmail token expiration timestamp")
    gmail_connected_at: Optional[datetime] = Field(default=None, description="Gmail connection timestamp")
    
    drive_access_token: Optional[str] = Field(default=None, description="Encrypted Drive access token")
    drive_refresh_token: Optional[str] = Field(default=None, description="Encrypted Drive refresh token")
    drive_token_expires_at: Optional[datetime] = Field(default=None, description="Drive token expiration timestamp")
    drive_connected_at: Optional[datetime] = Field(default=None, description="Drive connection timestamp")
    
    # New flexible service credentials storage
    service_credentials: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="JSON storage for all service credentials")
    service_connections: Optional[dict] = Field(default=None, sa_column=Column(JSON), description="JSON storage for service connection metadata")
    
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
    
    # New service management methods
    def get_service_credentials(self, service_type: str) -> Optional[dict]:
        """Get credentials for a specific service"""
        if not self.service_credentials:
            # Fall back to legacy fields for backward compatibility
            if service_type == "gmail":
                return {
                    "access_token": self.gmail_access_token,
                    "refresh_token": self.gmail_refresh_token,
                    "expires_at": self.gmail_token_expires_at.isoformat() if self.gmail_token_expires_at else None
                } if self.gmail_access_token else None
            elif service_type == "drive":
                return {
                    "access_token": self.drive_access_token,
                    "refresh_token": self.drive_refresh_token,
                    "expires_at": self.drive_token_expires_at.isoformat() if self.drive_token_expires_at else None
                } if self.drive_access_token else None
            return None
        
        return self.service_credentials.get(service_type)
    
    def set_service_credentials(self, service_type: str, credentials: dict):
        """Set credentials for a specific service"""
        if not self.service_credentials:
            self.service_credentials = {}
        
        self.service_credentials[service_type] = credentials
        
        # Also update legacy fields for backward compatibility
        if service_type == "gmail":
            self.gmail_access_token = credentials.get("access_token")
            self.gmail_refresh_token = credentials.get("refresh_token")
            expires_str = credentials.get("expires_at")
            self.gmail_token_expires_at = datetime.fromisoformat(expires_str) if expires_str else None
        elif service_type == "drive":
            self.drive_access_token = credentials.get("access_token")
            self.drive_refresh_token = credentials.get("refresh_token")
            expires_str = credentials.get("expires_at")
            self.drive_token_expires_at = datetime.fromisoformat(expires_str) if expires_str else None
    
    def get_service_connection_info(self, service_type: str) -> Optional[dict]:
        """Get connection metadata for a specific service"""
        if not self.service_connections:
            # Fall back to legacy fields
            if service_type == "gmail":
                return {
                    "connected_at": self.gmail_connected_at.isoformat() if self.gmail_connected_at else None,
                    "expires_at": self.gmail_token_expires_at.isoformat() if self.gmail_token_expires_at else None
                } if self.gmail_connected_at else None
            elif service_type == "drive":
                return {
                    "connected_at": self.drive_connected_at.isoformat() if self.drive_connected_at else None,
                    "expires_at": self.drive_token_expires_at.isoformat() if self.drive_token_expires_at else None
                } if self.drive_connected_at else None
            return None
        
        return self.service_connections.get(service_type)
    
    def set_service_connection_info(self, service_type: str, connection_info: dict):
        """Set connection metadata for a specific service"""
        if not self.service_connections:
            self.service_connections = {}
        
        self.service_connections[service_type] = connection_info
        
        # Also update legacy fields for backward compatibility
        if service_type == "gmail":
            connected_str = connection_info.get("connected_at")
            self.gmail_connected_at = datetime.fromisoformat(connected_str) if connected_str else None
        elif service_type == "drive":
            connected_str = connection_info.get("connected_at")
            self.drive_connected_at = datetime.fromisoformat(connected_str) if connected_str else None
    
    def is_service_connected(self, service_type: str) -> bool:
        """Check if a service is connected"""
        credentials = self.get_service_credentials(service_type)
        connection_info = self.get_service_connection_info(service_type)
        
        return (
            credentials is not None 
            and credentials.get("access_token") is not None
            and connection_info is not None
            and connection_info.get("connected_at") is not None
        )
    
    def is_service_token_expired(self, service_type: str) -> bool:
        """Check if a service's token is expired"""
        credentials = self.get_service_credentials(service_type)
        if not credentials or not credentials.get("expires_at"):
            return True
        
        expires_at = datetime.fromisoformat(credentials["expires_at"])
        return datetime.utcnow() >= expires_at
    
    def get_connected_services(self) -> List[str]:
        """Get list of all connected services"""
        connected = []
        
        # Check legacy services
        if self.is_gmail_connected:
            connected.append("gmail")
        if self.is_drive_connected:
            connected.append("drive")
        
        # Check new services
        if self.service_connections:
            for service_type in self.service_connections.keys():
                if self.is_service_connected(service_type) and service_type not in connected:
                    connected.append(service_type)
        
        return connected
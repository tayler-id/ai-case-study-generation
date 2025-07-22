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
    
    # Timestamps
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="User creation timestamp")
    updated_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
        description="Last update timestamp"
    )
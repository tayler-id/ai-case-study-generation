"""
Application Configuration Settings
Handles environment variables and application configuration
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database Configuration
    database_url: str = "postgresql://postgres:password@localhost:5432/casestudies"  # PostgreSQL for production
    # Alternative SQLite for development: "sqlite:///./test.db"
    
    # Google OAuth Configuration
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8001/auth/google/callback"
    
    # JWT Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    debug: bool = True
    
    # CORS Configuration
    cors_origins: str = "http://localhost:3000"
    
    # OAuth Scopes
    google_oauth_scopes: list[str] = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
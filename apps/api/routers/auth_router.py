"""
Authentication Router
Handles Google OAuth 2.0 authentication flow and JWT session management
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie
from fastapi.responses import RedirectResponse
from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
import json
import urllib.parse
from datetime import datetime, timedelta
from jose import jwt, JWTError
from typing import Optional
from sqlmodel import Session

from config import settings
from models.user import User
from repositories.user_repository import UserRepository
from database import get_session

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Configure Google OAuth Flow
def create_oauth_flow():
    """Create Google OAuth flow configuration"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        },
        scopes=settings.google_oauth_scopes,
    )
    flow.redirect_uri = settings.google_redirect_uri
    return flow

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None

def get_token_from_cookies(request: Request) -> Optional[str]:
    """Extract JWT token from HTTP-only cookies"""
    return request.cookies.get("access_token")

def create_secure_cookie_response(redirect_url: str, token: str, user_data: dict) -> RedirectResponse:
    """Create redirect response with secure HTTP-only cookies"""
    response = RedirectResponse(url=redirect_url)
    
    # Set access token in secure HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=settings.jwt_access_token_expire_minutes * 60,  # Convert minutes to seconds
        httponly=True,
        secure=not settings.debug,  # Use secure cookies in production
        samesite="lax",  # Protect against CSRF while allowing OAuth redirects
        path="/"
    )
    
    # Set user data in separate cookie (can be accessible to frontend)
    response.set_cookie(
        key="user_data",
        value=urllib.parse.quote(json.dumps(user_data)),
        max_age=settings.jwt_access_token_expire_minutes * 60,
        httponly=False,  # Frontend needs to read this
        secure=not settings.debug,
        samesite="lax",
        path="/"
    )
    
    # Set authentication status flag
    response.set_cookie(
        key="authenticated",
        value="true",
        max_age=settings.jwt_access_token_expire_minutes * 60,
        httponly=False,  # Frontend needs to read this
        secure=not settings.debug,
        samesite="lax",
        path="/"
    )
    
    return response

def clear_auth_cookies(response: Response) -> None:
    """Clear all authentication-related cookies"""
    cookie_names = ["access_token", "user_data", "authenticated"]
    for cookie_name in cookie_names:
        response.delete_cookie(
            key=cookie_name,
            path="/",
            secure=not settings.debug,
            samesite="lax"
        )

@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    try:
        flow = create_oauth_flow()
        
        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return RedirectResponse(url=auth_url)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth initialization failed: {str(e)}")

@router.get("/google/callback")
async def google_callback(request: Request, session: Session = Depends(get_session)):
    """Handle Google OAuth callback"""
    try:
        # Get the authorization code from the callback
        auth_code = request.query_params.get('code')
        
        if not auth_code:
            raise HTTPException(status_code=400, detail="Authorization code not received")
        
        # Exchange authorization code for tokens
        flow = create_oauth_flow()
        flow.fetch_token(code=auth_code)
        
        # Get user info from Google
        credentials = flow.credentials
        user_info_request = requests.Request()
        
        # Verify the ID token and get user information
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            user_info_request,
            settings.google_client_id
        )
        
        # Extract user information
        google_id = id_info.get('sub')
        email = id_info.get('email')
        name = id_info.get('name')
        avatar_url = id_info.get('picture')
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Required user information not available")
        
        # Use UserRepository to find or create user
        user_repo = UserRepository(session)
        user = user_repo.find_or_create_user(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url
        )
        
        # Create JWT token
        access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id), "google_id": google_id, "email": email, "name": name},
            expires_delta=access_token_expires
        )
        
        # Prepare user data for frontend
        user_data = {
            "id": str(user.id),
            "google_id": user.google_id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        
        # Create secure cookie response instead of URL parameters
        frontend_url = settings.cors_origins  # Clean redirect URL without sensitive data
        
        return create_secure_cookie_response(frontend_url, access_token, user_data)
    
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Authentication error: {str(e)}")
        print(traceback.format_exc())
        
        # Redirect to frontend with error (don't expose sensitive error details)
        error_url = f"{settings.cors_origins}?error=authentication_failed"
        return RedirectResponse(url=error_url)

@router.get("/me")
async def get_current_user(request: Request, session: Session = Depends(get_session)):
    """Get current authenticated user information"""
    try:
        # Get token from HTTP-only cookie (fallback to Authorization header for backward compatibility)
        token = request.cookies.get("access_token")
        
        if not token:
            # Fallback to Authorization header for API clients
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify token
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Get user from database using UserRepository
        user_repo = UserRepository(session)
        user = user_repo.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": str(user.id),
            "googleId": user.google_id,
            "email": user.email,
            "name": user.name,
            "avatarUrl": user.avatar_url,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "updatedAt": user.updated_at.isoformat() if user.updated_at else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user information: {str(e)}")

@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing authentication cookies"""
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    response.delete_cookie(key="user_data", samesite="lax")
    return {"message": "Logged out successfully"}
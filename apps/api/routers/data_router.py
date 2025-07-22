"""
Data Fetching Router
Handles fetching emails and documents from Gmail and Google Drive APIs
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlmodel import Session

from database import get_session
from models.user import User
from repositories.user_repository import UserRepository
from services.gmail_service import GmailService
from services.drive_service import DriveService
from services.token_refresh_service import TokenRefreshService
from routers.auth_router import get_current_user_from_token

router = APIRouter(prefix="/data", tags=["Data Fetching"])


class ProjectScopeRequest(BaseModel):
    """Request model for project scoping parameters"""
    project_name: str = Field(..., description="Name of the project")
    keywords: List[str] = Field(..., description="Keywords to search for")
    participant_emails: List[str] = Field(..., description="Email addresses of project participants")
    start_date: datetime = Field(..., description="Project start date")
    end_date: datetime = Field(..., description="Project end date")
    max_results: Optional[int] = Field(50, description="Maximum number of results to return")


class DataFetchResponse(BaseModel):
    """Response model for data fetching results"""
    success: bool
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    errors: Optional[List[str]] = None


@router.post("/fetch/gmail")
async def fetch_gmail_data(
    scope: ProjectScopeRequest,
    request: Request,
    session: Session = Depends(get_session)
) -> DataFetchResponse:
    """
    Fetch Gmail data for a project scope
    
    Args:
        scope: Project scoping parameters
        request: HTTP request object
        session: Database session
        
    Returns:
        Gmail data and metadata
    """
    try:
        # Get current user
        user = get_current_user_from_token(request, session)
        
        # Check if Gmail is connected
        if not user.is_gmail_connected:
            raise HTTPException(
                status_code=400, 
                detail="Gmail is not connected. Please connect Gmail first."
            )
        
        # Refresh tokens if needed
        token_service = TokenRefreshService(session)
        if not token_service.refresh_gmail_token(user):
            raise HTTPException(
                status_code=400,
                detail="Failed to refresh Gmail tokens. Please reconnect Gmail."
            )
        
        # Initialize Gmail service
        gmail_service = GmailService(user)
        
        # Fetch project emails
        email_data = gmail_service.get_project_emails(
            project_keywords=scope.keywords,
            participant_emails=scope.participant_emails,
            date_range=(scope.start_date, scope.end_date),
            max_results=scope.max_results
        )
        
        # Add project context to metadata
        email_data['metadata'].update({
            'project_name': scope.project_name,
            'fetch_timestamp': datetime.utcnow().isoformat(),
            'user_id': str(user.id)
        })
        
        return DataFetchResponse(
            success=True,
            data={'gmail': email_data},
            metadata=email_data['metadata']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return DataFetchResponse(
            success=False,
            data={},
            metadata={},
            errors=[f"Failed to fetch Gmail data: {str(e)}"]
        )


@router.post("/fetch/drive")
async def fetch_drive_data(
    scope: ProjectScopeRequest,
    request: Request,
    session: Session = Depends(get_session)
) -> DataFetchResponse:
    """
    Fetch Google Drive data for a project scope
    
    Args:
        scope: Project scoping parameters
        request: HTTP request object
        session: Database session
        
    Returns:
        Drive data and metadata
    """
    try:
        # Get current user
        user = get_current_user_from_token(request, session)
        
        # Check if Drive is connected
        if not user.is_drive_connected:
            raise HTTPException(
                status_code=400,
                detail="Google Drive is not connected. Please connect Google Drive first."
            )
        
        # Refresh tokens if needed
        token_service = TokenRefreshService(session)
        if not token_service.refresh_drive_token(user):
            raise HTTPException(
                status_code=400,
                detail="Failed to refresh Drive tokens. Please reconnect Google Drive."
            )
        
        # Initialize Drive service
        drive_service = DriveService(user)
        
        # Fetch project documents
        document_data = drive_service.get_project_documents(
            project_keywords=scope.keywords,
            participant_emails=scope.participant_emails,
            date_range=(scope.start_date, scope.end_date),
            max_results=scope.max_results
        )
        
        # Add project context to metadata
        document_data['metadata'].update({
            'project_name': scope.project_name,
            'fetch_timestamp': datetime.utcnow().isoformat(),
            'user_id': str(user.id)
        })
        
        return DataFetchResponse(
            success=True,
            data={'drive': document_data},
            metadata=document_data['metadata']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return DataFetchResponse(
            success=False,
            data={},
            metadata={},
            errors=[f"Failed to fetch Drive data: {str(e)}"]
        )


@router.post("/fetch/all")
async def fetch_all_project_data(
    scope: ProjectScopeRequest,
    request: Request,
    session: Session = Depends(get_session)
) -> DataFetchResponse:
    """
    Fetch all available data (Gmail + Drive) for a project scope
    
    Args:
        scope: Project scoping parameters
        request: HTTP request object
        session: Database session
        
    Returns:
        Combined Gmail and Drive data with metadata
    """
    try:
        # Get current user
        user = get_current_user_from_token(request, session)
        
        # Check connections
        gmail_connected = user.is_gmail_connected
        drive_connected = user.is_drive_connected
        
        if not gmail_connected and not drive_connected:
            raise HTTPException(
                status_code=400,
                detail="No data sources connected. Please connect Gmail and/or Google Drive."
            )
        
        # Refresh tokens if needed
        token_service = TokenRefreshService(session)
        refresh_results = token_service.refresh_all_user_tokens(user)
        
        combined_data = {}
        combined_metadata = {
            'project_name': scope.project_name,
            'fetch_timestamp': datetime.utcnow().isoformat(),
            'user_id': str(user.id),
            'sources_fetched': [],
            'sources_failed': []
        }
        errors = []
        
        # Fetch Gmail data if connected
        if gmail_connected:
            try:
                if refresh_results.get('gmail', False):
                    gmail_service = GmailService(user)
                    email_data = gmail_service.get_project_emails(
                        project_keywords=scope.keywords,
                        participant_emails=scope.participant_emails,
                        date_range=(scope.start_date, scope.end_date),
                        max_results=scope.max_results
                    )
                    combined_data['gmail'] = email_data
                    combined_metadata['sources_fetched'].append('gmail')
                    combined_metadata['gmail_metadata'] = email_data['metadata']
                else:
                    errors.append("Failed to refresh Gmail tokens")
                    combined_metadata['sources_failed'].append('gmail')
            except Exception as e:
                errors.append(f"Gmail fetch failed: {str(e)}")
                combined_metadata['sources_failed'].append('gmail')
        
        # Fetch Drive data if connected
        if drive_connected:
            try:
                if refresh_results.get('drive', False):
                    drive_service = DriveService(user)
                    document_data = drive_service.get_project_documents(
                        project_keywords=scope.keywords,
                        participant_emails=scope.participant_emails,
                        date_range=(scope.start_date, scope.end_date),
                        max_results=scope.max_results
                    )
                    combined_data['drive'] = document_data
                    combined_metadata['sources_fetched'].append('drive')
                    combined_metadata['drive_metadata'] = document_data['metadata']
                else:
                    errors.append("Failed to refresh Drive tokens")
                    combined_metadata['sources_failed'].append('drive')
            except Exception as e:
                errors.append(f"Drive fetch failed: {str(e)}")
                combined_metadata['sources_failed'].append('drive')
        
        # Calculate combined statistics
        total_items = 0
        if 'gmail' in combined_data:
            total_items += combined_data['gmail']['metadata']['total_emails']
        if 'drive' in combined_data:
            total_items += combined_data['drive']['metadata']['total_documents']
        
        combined_metadata['total_items_fetched'] = total_items
        
        success = len(combined_metadata['sources_fetched']) > 0
        
        return DataFetchResponse(
            success=success,
            data=combined_data,
            metadata=combined_metadata,
            errors=errors if errors else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return DataFetchResponse(
            success=False,
            data={},
            metadata={},
            errors=[f"Failed to fetch project data: {str(e)}"]
        )


@router.get("/connections/health")
async def check_connections_health(
    request: Request,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Check the health status of all data connections
    
    Args:
        request: HTTP request object
        session: Database session
        
    Returns:
        Health status for all connected services
    """
    try:
        # Get current user
        user = get_current_user_from_token(request, session)
        
        # Get token status
        token_service = TokenRefreshService(session)
        token_status = token_service.get_token_status(user)
        
        # Test connections by attempting token refresh
        refresh_results = token_service.refresh_all_user_tokens(user)
        
        health_status = {
            'user_id': str(user.id),
            'overall_health': 'healthy',
            'services': {},
            'last_checked': datetime.utcnow().isoformat()
        }
        
        issues = []
        
        # Check Gmail
        if user.is_gmail_connected:
            gmail_healthy = refresh_results.get('gmail', False)
            health_status['services']['gmail'] = {
                'connected': True,
                'healthy': gmail_healthy,
                'token_status': token_status['gmail'],
                'last_refresh_success': gmail_healthy
            }
            if not gmail_healthy:
                issues.append('Gmail token refresh failed')
        else:
            health_status['services']['gmail'] = {
                'connected': False,
                'healthy': False,
                'token_status': None
            }
        
        # Check Drive
        if user.is_drive_connected:
            drive_healthy = refresh_results.get('drive', False)
            health_status['services']['drive'] = {
                'connected': True,
                'healthy': drive_healthy,
                'token_status': token_status['drive'],
                'last_refresh_success': drive_healthy
            }
            if not drive_healthy:
                issues.append('Drive token refresh failed')
        else:
            health_status['services']['drive'] = {
                'connected': False,
                'healthy': False,
                'token_status': None
            }
        
        # Determine overall health
        if issues:
            health_status['overall_health'] = 'degraded'
            health_status['issues'] = issues
        
        if not user.is_gmail_connected and not user.is_drive_connected:
            health_status['overall_health'] = 'no_connections'
        
        return health_status
        
    except HTTPException:
        raise
    except Exception as e:
        return {
            'overall_health': 'error',
            'error': str(e),
            'last_checked': datetime.utcnow().isoformat()
        }


@router.post("/preview")
async def preview_project_data(
    scope: ProjectScopeRequest,
    request: Request,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get a preview of project data without fetching full content
    
    Args:
        scope: Project scoping parameters
        request: HTTP request object
        session: Database session
        
    Returns:
        Preview of available data for the project scope
    """
    try:
        # Get current user
        user = get_current_user_from_token(request, session)
        
        # Refresh tokens
        token_service = TokenRefreshService(session)
        refresh_results = token_service.refresh_all_user_tokens(user)
        
        preview_data = {
            'project_name': scope.project_name,
            'date_range': {
                'start': scope.start_date.isoformat(),
                'end': scope.end_date.isoformat()
            },
            'keywords': scope.keywords,
            'participants': scope.participant_emails,
            'available_sources': [],
            'estimated_results': {}
        }
        
        # Preview Gmail data if connected
        if user.is_gmail_connected and refresh_results.get('gmail', False):
            try:
                gmail_service = GmailService(user)
                
                # Do a limited search to estimate results
                preview_emails = gmail_service.search_emails(
                    query=" OR ".join([f'"{keyword}"' for keyword in scope.keywords]),
                    max_results=10,  # Just get a small sample
                    date_range=(scope.start_date, scope.end_date)
                )
                
                preview_data['available_sources'].append('gmail')
                preview_data['estimated_results']['gmail'] = {
                    'sample_count': len(preview_emails),
                    'sample_subjects': [email.subject for email in preview_emails[:5]],
                    'estimated_total': 'Available for full fetch'
                }
            except Exception as e:
                preview_data['estimated_results']['gmail'] = {'error': str(e)}
        
        # Preview Drive data if connected
        if user.is_drive_connected and refresh_results.get('drive', False):
            try:
                drive_service = DriveService(user)
                
                # Do a limited search to estimate results
                preview_files = drive_service.search_files(
                    query=" or ".join([f"name contains '{keyword}'" for keyword in scope.keywords]),
                    max_results=10,
                    date_range=(scope.start_date, scope.end_date)
                )
                
                preview_data['available_sources'].append('drive')
                preview_data['estimated_results']['drive'] = {
                    'sample_count': len(preview_files),
                    'sample_files': [file.name for file in preview_files[:5]],
                    'file_types': list(set([drive_service.SUPPORTED_MIME_TYPES.get(file.mime_type, 'Other') for file in preview_files])),
                    'estimated_total': 'Available for full fetch'
                }
            except Exception as e:
                preview_data['estimated_results']['drive'] = {'error': str(e)}
        
        preview_data['preview_timestamp'] = datetime.utcnow().isoformat()
        
        return preview_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate data preview: {str(e)}"
        )
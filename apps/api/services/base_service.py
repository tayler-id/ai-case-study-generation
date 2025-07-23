"""
Base Service Architecture
Provides abstract base classes for integrating external services like Gmail, Drive, Confluence, Slack, etc.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from models.user import User


class ServiceType(Enum):
    """Supported service types"""
    GMAIL = "gmail"
    DRIVE = "drive"
    CONFLUENCE = "confluence"
    SLACK = "slack"
    NOTION = "notion"
    JIRA = "jira"
    TRELLO = "trello"
    GITHUB = "github"


class ServiceStatus(Enum):
    """Service connection status"""
    DISCONNECTED = "disconnected"
    CONNECTED = "connected"
    EXPIRED = "expired"
    ERROR = "error"


@dataclass
class ServiceCredentials:
    """Standardized service credentials"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scopes: List[str] = None
    extra_data: Dict[str, Any] = None  # For service-specific data


@dataclass
class ServiceConnectionInfo:
    """Service connection information"""
    service_type: ServiceType
    service_name: str
    status: ServiceStatus
    connected_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    scopes: List[str] = None
    last_error: Optional[str] = None


@dataclass
class ProjectData:
    """Standardized project data from any service"""
    service_type: ServiceType
    items: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    fetch_timestamp: datetime
    total_items: int
    source_info: Dict[str, Any]


class BaseService(ABC):
    """Abstract base class for all external service integrations"""
    
    def __init__(self, user: User, service_type: ServiceType):
        self.user = user
        self.service_type = service_type
        self.service_name = service_type.value
        
    @abstractmethod
    def get_service_credentials(self) -> Optional[ServiceCredentials]:
        """Get stored credentials for this service"""
        pass
    
    @abstractmethod
    def is_connected(self) -> bool:
        """Check if service is connected and has valid credentials"""
        pass
    
    @abstractmethod
    def is_expired(self) -> bool:
        """Check if service credentials are expired"""
        pass
    
    @abstractmethod
    def refresh_credentials(self) -> bool:
        """Refresh expired credentials if possible"""
        pass
    
    @abstractmethod
    def get_oauth_scopes(self) -> List[str]:
        """Get required OAuth scopes for this service"""
        pass
    
    @abstractmethod
    def get_project_data(
        self, 
        project_keywords: List[str],
        participant_emails: List[str],
        date_range: Tuple[datetime, datetime],
        max_results: int = 100
    ) -> ProjectData:
        """Fetch project-related data from this service"""
        pass
    
    def get_connection_info(self) -> ServiceConnectionInfo:
        """Get standardized connection info"""
        credentials = self.get_service_credentials()
        
        if not credentials:
            return ServiceConnectionInfo(
                service_type=self.service_type,
                service_name=self.service_name,
                status=ServiceStatus.DISCONNECTED
            )
        
        status = ServiceStatus.CONNECTED
        if self.is_expired():
            status = ServiceStatus.EXPIRED
        
        return ServiceConnectionInfo(
            service_type=self.service_type,
            service_name=self.service_name,
            status=status,
            connected_at=self._get_connected_at(),
            expires_at=credentials.expires_at,
            scopes=credentials.scopes
        )
    
    @abstractmethod
    def _get_connected_at(self) -> Optional[datetime]:
        """Get the timestamp when service was connected"""
        pass


class OAuthService(BaseService):
    """Base class for OAuth-based services (Google, Atlassian, etc.)"""
    
    @abstractmethod
    def get_oauth_config(self) -> Dict[str, str]:
        """Get OAuth configuration (client_id, client_secret, etc.)"""
        pass
    
    @abstractmethod
    def get_oauth_urls(self) -> Dict[str, str]:
        """Get OAuth URLs (auth_uri, token_uri, etc.)"""
        pass
    
    @abstractmethod
    def get_redirect_uri(self) -> str:
        """Get OAuth redirect URI for this service"""
        pass


class APIKeyService(BaseService):
    """Base class for API key-based services"""
    
    @abstractmethod
    def get_api_key(self) -> Optional[str]:
        """Get stored API key for this service"""
        pass
    
    @abstractmethod
    def validate_api_key(self, api_key: str) -> bool:
        """Validate an API key"""
        pass


# Service capability interfaces
class EmailServiceMixin:
    """Mixin for services that provide email data"""
    
    @abstractmethod
    def search_emails(self, query: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """Search for emails"""
        pass
    
    @abstractmethod
    def get_email_threads(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """Get email conversation threads"""
        pass


class DocumentServiceMixin:
    """Mixin for services that provide document data"""
    
    @abstractmethod
    def search_documents(self, query: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """Search for documents"""
        pass
    
    @abstractmethod
    def get_document_content(self, document_id: str) -> Optional[str]:
        """Get content of a specific document"""
        pass


class ProjectManagementServiceMixin:
    """Mixin for services that provide project management data"""
    
    @abstractmethod
    def get_projects(self, query: str = None) -> List[Dict[str, Any]]:
        """Get projects/spaces"""
        pass
    
    @abstractmethod
    def get_project_issues(self, project_id: str) -> List[Dict[str, Any]]:
        """Get issues/tickets for a project"""
        pass
    
    @abstractmethod
    def get_project_activity(self, project_id: str, date_range: Tuple[datetime, datetime]) -> List[Dict[str, Any]]:
        """Get activity/timeline for a project"""
        pass


class CommunicationServiceMixin:
    """Mixin for services that provide communication data"""
    
    @abstractmethod
    def get_channels(self, query: str = None) -> List[Dict[str, Any]]:
        """Get communication channels"""
        pass
    
    @abstractmethod
    def get_channel_messages(
        self, 
        channel_id: str, 
        date_range: Tuple[datetime, datetime]
    ) -> List[Dict[str, Any]]:
        """Get messages from a channel"""
        pass
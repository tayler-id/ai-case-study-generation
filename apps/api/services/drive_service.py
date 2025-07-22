"""
Google Drive API Service
Handles fetching documents and metadata using Google Drive API
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from dataclasses import dataclass
import mimetypes

from models.user import User


@dataclass
class DriveFile:
    """Represents a Google Drive file with relevant metadata"""
    id: str
    name: str
    mime_type: str
    size: Optional[int]
    created_time: datetime
    modified_time: datetime
    owners: List[str]
    last_modifying_user: str
    shared: bool
    web_view_link: str
    parent_folders: List[str]
    permissions: List[Dict[str, Any]]
    thumbnail_link: Optional[str]
    description: Optional[str]
    content_preview: Optional[str]  # For text-based files


@dataclass
class DriveFolder:
    """Represents a Google Drive folder with metadata"""
    id: str
    name: str
    created_time: datetime
    modified_time: datetime
    owners: List[str]
    shared: bool
    web_view_link: str
    parent_folders: List[str]
    child_count: int
    children: List[DriveFile]


class DriveService:
    """Service class for interacting with Google Drive API"""
    
    # Supported file types for content extraction
    SUPPORTED_MIME_TYPES = {
        'application/vnd.google-apps.document': 'Google Docs',
        'application/vnd.google-apps.spreadsheet': 'Google Sheets', 
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/pdf': 'PDF',
        'text/plain': 'Text File',
        'text/csv': 'CSV File',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint'
    }
    
    def __init__(self, user: User):
        """Initialize Drive service with user credentials"""
        self.user = user
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Drive API service with user's OAuth tokens"""
        if not self.user.is_drive_connected:
            raise ValueError("User Google Drive is not connected")
        
        # Create credentials from stored tokens
        credentials = Credentials(
            token=self.user.drive_access_token,
            refresh_token=self.user.drive_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._get_client_id(),
            client_secret=self._get_client_secret(),
            scopes=["https://www.googleapis.com/auth/drive.readonly"]
        )
        
        # Check if token is expired and refresh if needed
        if credentials.expired:
            try:
                credentials.refresh(Request())
                # Update user's tokens in database (this should be handled by calling code)
                self.user.drive_access_token = credentials.token
                if credentials.expiry:
                    self.user.drive_token_expires_at = credentials.expiry
            except Exception as e:
                raise ValueError(f"Failed to refresh Drive credentials: {str(e)}")
        
        self.service = build('drive', 'v3', credentials=credentials)
    
    def _get_client_id(self) -> str:
        """Get Google OAuth client ID from settings"""
        from config import settings
        return settings.google_client_id
    
    def _get_client_secret(self) -> str:
        """Get Google OAuth client secret from settings"""
        from config import settings
        return settings.google_client_secret
    
    def search_files(
        self,
        query: str,
        max_results: int = 50,
        date_range: Optional[tuple[datetime, datetime]] = None,
        file_types: Optional[List[str]] = None
    ) -> List[DriveFile]:
        """
        Search for files using Drive API query syntax
        
        Args:
            query: Drive search query (e.g., "name contains 'project'")
            max_results: Maximum number of files to return
            date_range: Optional tuple of (start_date, end_date)
            file_types: Optional list of MIME types to filter by
            
        Returns:
            List of DriveFile objects
        """
        try:
            # Build search query
            search_query = query
            
            # Add date range filter
            if date_range:
                start_date, end_date = date_range
                search_query += f" and modifiedTime >= '{start_date.isoformat()}'"
                search_query += f" and modifiedTime <= '{end_date.isoformat()}'"
            
            # Add file type filter
            if file_types:
                mime_query = " or ".join([f"mimeType='{mime_type}'" for mime_type in file_types])
                search_query += f" and ({mime_query})"
            
            # Exclude trashed files
            search_query += " and trashed=false"
            
            # Execute search
            results = self.service.files().list(
                q=search_query,
                pageSize=max_results,
                fields="files(id,name,mimeType,size,createdTime,modifiedTime,owners,lastModifyingUser,shared,webViewLink,parents,permissions,thumbnailLink,description)",
                orderBy="modifiedTime desc"
            ).execute()
            
            files = results.get('files', [])
            
            # Convert to DriveFile objects
            drive_files = []
            for file_data in files:
                drive_file = self._parse_file(file_data)
                if drive_file:
                    drive_files.append(drive_file)
            
            return drive_files
            
        except HttpError as error:
            raise ValueError(f"Drive API error: {error}")
    
    def get_folder_contents(
        self, 
        folder_id: str, 
        recursive: bool = False,
        max_results: int = 100
    ) -> DriveFolder:
        """
        Get contents of a specific folder
        
        Args:
            folder_id: ID of the folder to retrieve
            recursive: Whether to recursively get subfolder contents
            max_results: Maximum number of files to return
            
        Returns:
            DriveFolder object with contents
        """
        try:
            # Get folder metadata
            folder_metadata = self.service.files().get(
                fileId=folder_id,
                fields="id,name,createdTime,modifiedTime,owners,shared,webViewLink,parents"
            ).execute()
            
            # Get folder contents
            results = self.service.files().list(
                q=f"'{folder_id}' in parents and trashed=false",
                pageSize=max_results,
                fields="files(id,name,mimeType,size,createdTime,modifiedTime,owners,lastModifyingUser,shared,webViewLink,parents,permissions,thumbnailLink,description)",
                orderBy="modifiedTime desc"
            ).execute()
            
            files = results.get('files', [])
            
            # Parse files
            drive_files = []
            for file_data in files:
                drive_file = self._parse_file(file_data)
                if drive_file:
                    # Get content preview for supported files
                    if self._is_supported_for_preview(drive_file.mime_type):
                        drive_file.content_preview = self._get_file_preview(drive_file.id, drive_file.mime_type)
                    drive_files.append(drive_file)
            
            # Parse folder
            drive_folder = DriveFolder(
                id=folder_metadata['id'],
                name=folder_metadata['name'],
                created_time=self._parse_datetime(folder_metadata.get('createdTime')),
                modified_time=self._parse_datetime(folder_metadata.get('modifiedTime')),
                owners=[owner.get('displayName', owner.get('emailAddress', 'Unknown')) 
                       for owner in folder_metadata.get('owners', [])],
                shared=folder_metadata.get('shared', False),
                web_view_link=folder_metadata.get('webViewLink', ''),
                parent_folders=folder_metadata.get('parents', []),
                child_count=len(drive_files),
                children=drive_files
            )
            
            return drive_folder
            
        except HttpError as error:
            raise ValueError(f"Drive API error: {error}")
    
    def get_project_documents(
        self,
        project_keywords: List[str],
        participant_emails: List[str], 
        date_range: tuple[datetime, datetime],
        max_results: int = 100
    ) -> Dict[str, Any]:
        """
        Get documents related to a specific project
        
        Args:
            project_keywords: List of keywords to search for in document names/content
            participant_emails: List of email addresses of project participants
            date_range: Tuple of (start_date, end_date)
            max_results: Maximum number of documents to return
            
        Returns:
            Dictionary containing documents, folders, and metadata
        """
        try:
            # Build search queries
            keyword_query = " or ".join([f"name contains '{keyword}'" for keyword in project_keywords])
            
            # Search for documents by keywords
            files = self.search_files(
                query=f"({keyword_query})",
                max_results=max_results,
                date_range=date_range,
                file_types=list(self.SUPPORTED_MIME_TYPES.keys())
            )
            
            # Filter files by participants (owners, last modifying user, or shared with)
            relevant_files = []
            for file in files:
                if self._is_file_relevant_to_participants(file, participant_emails):
                    # Get content preview for supported files
                    if self._is_supported_for_preview(file.mime_type):
                        file.content_preview = self._get_file_preview(file.id, file.mime_type)
                    relevant_files.append(file)
            
            # Calculate statistics
            file_types = {}
            owners = set()
            date_range_actual = None
            
            if relevant_files:
                dates = [file.modified_time for file in relevant_files]
                date_range_actual = (min(dates), max(dates))
                
                for file in relevant_files:
                    # Count file types
                    file_type = self.SUPPORTED_MIME_TYPES.get(file.mime_type, 'Other')
                    file_types[file_type] = file_types.get(file_type, 0) + 1
                    
                    # Collect owners
                    owners.update(file.owners)
            
            return {
                'documents': [self._file_to_dict(file) for file in relevant_files],
                'metadata': {
                    'total_documents': len(relevant_files),
                    'file_types': file_types,
                    'owners': list(owners),
                    'date_range': {
                        'start': date_range_actual[0].isoformat() if date_range_actual else None,
                        'end': date_range_actual[1].isoformat() if date_range_actual else None
                    },
                    'keywords_used': project_keywords,
                    'participants_searched': participant_emails
                }
            }
            
        except Exception as e:
            raise ValueError(f"Failed to fetch project documents: {str(e)}")
    
    def _parse_file(self, file_data: Dict) -> Optional[DriveFile]:
        """Parse Drive API file response into DriveFile object"""
        try:
            return DriveFile(
                id=file_data['id'],
                name=file_data['name'],
                mime_type=file_data.get('mimeType', ''),
                size=int(file_data.get('size', 0)) if file_data.get('size') else None,
                created_time=self._parse_datetime(file_data.get('createdTime')),
                modified_time=self._parse_datetime(file_data.get('modifiedTime')),
                owners=[owner.get('displayName', owner.get('emailAddress', 'Unknown')) 
                       for owner in file_data.get('owners', [])],
                last_modifying_user=file_data.get('lastModifyingUser', {}).get('displayName', 'Unknown'),
                shared=file_data.get('shared', False),
                web_view_link=file_data.get('webViewLink', ''),
                parent_folders=file_data.get('parents', []),
                permissions=file_data.get('permissions', []),
                thumbnail_link=file_data.get('thumbnailLink'),
                description=file_data.get('description'),
                content_preview=None  # Will be populated later if needed
            )
        except Exception:
            return None
    
    def _parse_datetime(self, datetime_str: Optional[str]) -> datetime:
        """Parse ISO datetime string into datetime object"""
        if not datetime_str:
            return datetime.now()
        
        try:
            # Handle different datetime formats from Drive API
            if datetime_str.endswith('Z'):
                datetime_str = datetime_str[:-1] + '+00:00'
            return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return datetime.now()
    
    def _is_file_relevant_to_participants(self, file: DriveFile, participant_emails: List[str]) -> bool:
        """Check if a file is relevant to project participants"""
        # Check owners
        for owner in file.owners:
            if any(email.lower() in owner.lower() for email in participant_emails):
                return True
        
        # Check last modifying user
        if any(email.lower() in file.last_modifying_user.lower() for email in participant_emails):
            return True
        
        # Check permissions (shared with)
        for permission in file.permissions:
            email_address = permission.get('emailAddress', '')
            if email_address.lower() in [email.lower() for email in participant_emails]:
                return True
        
        return False
    
    def _is_supported_for_preview(self, mime_type: str) -> bool:
        """Check if file type is supported for content preview"""
        return mime_type in self.SUPPORTED_MIME_TYPES
    
    def _get_file_preview(self, file_id: str, mime_type: str, max_length: int = 500) -> str:
        """Get a preview of file content for supported file types"""
        try:
            if mime_type == 'application/vnd.google-apps.document':
                # Export Google Doc as plain text
                content = self.service.files().export(
                    fileId=file_id,
                    mimeType='text/plain'
                ).execute()
                text = content.decode('utf-8', errors='ignore')
                
            elif mime_type == 'application/vnd.google-apps.spreadsheet':
                # Export Google Sheet as CSV
                content = self.service.files().export(
                    fileId=file_id,
                    mimeType='text/csv'
                ).execute()
                text = content.decode('utf-8', errors='ignore')
                
            elif mime_type == 'application/vnd.google-apps.presentation':
                # Export Google Slides as plain text
                content = self.service.files().export(
                    fileId=file_id,
                    mimeType='text/plain'
                ).execute()
                text = content.decode('utf-8', errors='ignore')
                
            elif mime_type == 'text/plain':
                # Get plain text file content
                content = self.service.files().get_media(fileId=file_id).execute()
                text = content.decode('utf-8', errors='ignore')
                
            else:
                # For other file types, return file name and type info
                return f"[{self.SUPPORTED_MIME_TYPES.get(mime_type, 'File')}]"
            
            # Truncate and clean the text
            if len(text) > max_length:
                text = text[:max_length] + "..."
            
            # Remove excessive whitespace
            text = ' '.join(text.split())
            
            return text
            
        except (HttpError, UnicodeDecodeError, Exception):
            return f"[Preview unavailable for {self.SUPPORTED_MIME_TYPES.get(mime_type, 'file')}]"
    
    def _file_to_dict(self, file: DriveFile) -> Dict[str, Any]:
        """Convert DriveFile to dictionary for JSON serialization"""
        return {
            'id': file.id,
            'name': file.name,
            'mime_type': file.mime_type,
            'file_type': self.SUPPORTED_MIME_TYPES.get(file.mime_type, 'Other'),
            'size': file.size,
            'created_time': file.created_time.isoformat(),
            'modified_time': file.modified_time.isoformat(),
            'owners': file.owners,
            'last_modifying_user': file.last_modifying_user,
            'shared': file.shared,
            'web_view_link': file.web_view_link,
            'parent_folders': file.parent_folders,
            'thumbnail_link': file.thumbnail_link,
            'description': file.description,
            'content_preview': file.content_preview
        }
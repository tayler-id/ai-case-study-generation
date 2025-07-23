"""
Gmail Service Implementation (v2)
Uses the new flexible service architecture
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from models.user import User
from .base_service import OAuthService, ServiceType, ServiceCredentials, ProjectData, EmailServiceMixin
from config import get_settings


class GmailServiceV2(OAuthService, EmailServiceMixin):
    """Gmail service implementation using new architecture"""
    
    def __init__(self, user: User, service_type: ServiceType = ServiceType.GMAIL):
        super().__init__(user, service_type)
        self.settings = get_settings()
        self.service = None
        self._initialize_service()
    
    def get_service_credentials(self) -> Optional[ServiceCredentials]:
        """Get stored Gmail credentials"""
        creds_dict = self.user.get_service_credentials("gmail")
        if not creds_dict:
            return None
        
        return ServiceCredentials(
            access_token=creds_dict.get("access_token"),
            refresh_token=creds_dict.get("refresh_token"),
            expires_at=datetime.fromisoformat(creds_dict["expires_at"]) if creds_dict.get("expires_at") else None,
            scopes=creds_dict.get("scopes", self.get_oauth_scopes())
        )
    
    def is_connected(self) -> bool:
        """Check if Gmail is connected"""
        return self.user.is_service_connected("gmail")
    
    def is_expired(self) -> bool:
        """Check if Gmail credentials are expired"""
        return self.user.is_service_token_expired("gmail")
    
    def refresh_credentials(self) -> bool:
        """Refresh expired Gmail credentials"""
        credentials = self.get_service_credentials()
        if not credentials or not credentials.refresh_token:
            return False
        
        try:
            google_creds = Credentials(
                token=credentials.access_token,
                refresh_token=credentials.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.settings.google_client_id,
                client_secret=self.settings.google_client_secret
            )
            
            google_creds.refresh(Request())
            
            # Update stored credentials
            new_credentials = {
                "access_token": google_creds.token,
                "refresh_token": google_creds.refresh_token,
                "expires_at": google_creds.expiry.isoformat() if google_creds.expiry else None,
                "scopes": credentials.scopes
            }
            
            self.user.set_service_credentials("gmail", new_credentials)
            return True
            
        except Exception:
            return False
    
    def get_oauth_scopes(self) -> List[str]:
        """Get required OAuth scopes for Gmail"""
        return [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile", 
            "openid",
            "https://www.googleapis.com/auth/gmail.readonly"
        ]
    
    def get_oauth_config(self) -> Dict[str, str]:
        """Get OAuth configuration"""
        return {
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret
        }
    
    def get_oauth_urls(self) -> Dict[str, str]:
        """Get OAuth URLs"""
        return {
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    
    def get_redirect_uri(self) -> str:
        """Get OAuth redirect URI"""
        return f"http://localhost:8001/auth/connections/callback/gmail"
    
    def _get_connected_at(self) -> Optional[datetime]:
        """Get connection timestamp"""
        connection_info = self.user.get_service_connection_info("gmail")
        if not connection_info:
            return None
        
        connected_str = connection_info.get("connected_at")
        return datetime.fromisoformat(connected_str) if connected_str else None
    
    def _initialize_service(self):
        """Initialize Gmail API service"""
        if not self.is_connected():
            return
        
        credentials = self.get_service_credentials()
        if not credentials:
            return
        
        google_creds = Credentials(
            token=credentials.access_token,
            refresh_token=credentials.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.settings.google_client_id,
            client_secret=self.settings.google_client_secret,
            scopes=credentials.scopes
        )
        
        # Refresh if expired
        if self.is_expired():
            if not self.refresh_credentials():
                return
            # Get updated credentials
            credentials = self.get_service_credentials()
            google_creds.token = credentials.access_token
        
        self.service = build('gmail', 'v1', credentials=google_creds)
    
    def get_project_data(
        self, 
        project_keywords: List[str],
        participant_emails: List[str],
        date_range: Tuple[datetime, datetime],
        max_results: int = 100
    ) -> ProjectData:
        """Fetch Gmail data for a project"""
        if not self.service:
            return ProjectData(
                service_type=self.service_type,
                items=[],
                metadata={"error": "Gmail service not initialized"},
                fetch_timestamp=datetime.utcnow(),
                total_items=0,
                source_info={"service": "gmail", "status": "error"}
            )
        
        try:
            # Build search query
            keyword_query = " OR ".join([f'"{keyword}"' for keyword in project_keywords])
            participant_query = " OR ".join([f"from:{email}" for email in participant_emails])
            participant_query += " OR " + " OR ".join([f"to:{email}" for email in participant_emails])
            
            search_query = f"({keyword_query}) AND ({participant_query})"
            
            # Add date range
            start_date, end_date = date_range
            search_query += f" after:{start_date.strftime('%Y/%m/%d')}"
            search_query += f" before:{end_date.strftime('%Y/%m/%d')}"
            
            # Search for messages
            results = self.service.users().messages().list(
                userId='me',
                q=search_query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            
            # Fetch message details
            email_items = []
            for msg in messages:
                try:
                    message_detail = self.service.users().messages().get(
                        userId='me',
                        id=msg['id']
                    ).execute()
                    
                    # Parse message
                    parsed_message = self._parse_message(message_detail)
                    email_items.append(parsed_message)
                    
                except HttpError:
                    continue
            
            return ProjectData(
                service_type=self.service_type,
                items=email_items,
                metadata={
                    "total_emails": len(email_items),
                    "search_query": search_query,
                    "date_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    },
                    "keywords_used": project_keywords,
                    "participants_searched": participant_emails
                },
                fetch_timestamp=datetime.utcnow(),
                total_items=len(email_items),
                source_info={"service": "gmail", "status": "success"}
            )
            
        except Exception as e:
            return ProjectData(
                service_type=self.service_type,
                items=[],
                metadata={"error": str(e)},
                fetch_timestamp=datetime.utcnow(),
                total_items=0,
                source_info={"service": "gmail", "status": "error"}
            )
    
    def search_emails(self, query: str, max_results: int = 50) -> List[Dict[str, Any]]:
        """Search for emails"""
        if not self.service:
            return []
        
        try:
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            email_list = []
            
            for msg in messages:
                message_detail = self.service.users().messages().get(
                    userId='me',
                    id=msg['id']
                ).execute()
                
                email_list.append(self._parse_message(message_detail))
            
            return email_list
            
        except HttpError:
            return []
    
    def get_email_threads(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """Get email conversation threads"""
        if not self.service:
            return []
        
        try:
            results = self.service.users().threads().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            threads = results.get('threads', [])
            thread_list = []
            
            for thread in threads:
                thread_detail = self.service.users().threads().get(
                    userId='me',
                    id=thread['id']
                ).execute()
                
                thread_list.append(self._parse_thread(thread_detail))
            
            return thread_list
            
        except HttpError:
            return []
    
    def _parse_message(self, message: Dict) -> Dict[str, Any]:
        """Parse Gmail API message response"""
        payload = message['payload']
        headers = {h['name'].lower(): h['value'] for h in payload.get('headers', [])}
        
        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'subject': headers.get('subject', 'No Subject'),
            'sender': headers.get('from', 'Unknown Sender'),
            'recipient': headers.get('to', 'Unknown Recipient'),
            'date': headers.get('date', ''),
            'snippet': message.get('snippet', ''),
            'labels': message.get('labelIds', [])
        }
    
    def _parse_thread(self, thread: Dict) -> Dict[str, Any]:
        """Parse Gmail API thread response"""
        messages = []
        participants = set()
        
        for msg in thread.get('messages', []):
            parsed_msg = self._parse_message(msg)
            messages.append(parsed_msg)
            participants.add(parsed_msg['sender'])
            participants.add(parsed_msg['recipient'])
        
        subject = messages[0]['subject'] if messages else "No Subject"
        
        return {
            'id': thread['id'],
            'subject': subject,
            'participants': list(participants),
            'message_count': len(messages),
            'messages': messages
        }
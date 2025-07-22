"""
Gmail API Service
Handles fetching emails and metadata using Gmail API
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
import email
import html
import re
from dataclasses import dataclass

from models.user import User


@dataclass
class EmailMessage:
    """Represents a Gmail message with relevant metadata"""
    id: str
    thread_id: str
    subject: str
    sender: str
    recipient: str
    date: datetime
    snippet: str
    body_text: str
    body_html: str
    labels: List[str]
    attachments: List[Dict[str, Any]]


@dataclass
class EmailThread:
    """Represents a Gmail thread (conversation)"""
    id: str
    subject: str
    participants: List[str]
    message_count: int
    last_message_date: datetime
    messages: List[EmailMessage]
    labels: List[str]


class GmailService:
    """Service class for interacting with Gmail API"""
    
    def __init__(self, user: User):
        """Initialize Gmail service with user credentials"""
        self.user = user
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Gmail API service with user's OAuth tokens"""
        if not self.user.is_gmail_connected:
            raise ValueError("User Gmail is not connected")
        
        # Create credentials from stored tokens
        credentials = Credentials(
            token=self.user.gmail_access_token,
            refresh_token=self.user.gmail_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self._get_client_id(),
            client_secret=self._get_client_secret(),
            scopes=["https://www.googleapis.com/auth/gmail.readonly"]
        )
        
        # Check if token is expired and refresh if needed
        if credentials.expired:
            try:
                credentials.refresh(Request())
                # Update user's tokens in database (this should be handled by calling code)
                self.user.gmail_access_token = credentials.token
                if credentials.expiry:
                    self.user.gmail_token_expires_at = credentials.expiry
            except Exception as e:
                raise ValueError(f"Failed to refresh Gmail credentials: {str(e)}")
        
        self.service = build('gmail', 'v1', credentials=credentials)
    
    def _get_client_id(self) -> str:
        """Get Google OAuth client ID from settings"""
        from config import settings
        return settings.google_client_id
    
    def _get_client_secret(self) -> str:
        """Get Google OAuth client secret from settings"""
        from config import settings
        return settings.google_client_secret
    
    def search_emails(
        self, 
        query: str, 
        max_results: int = 50,
        date_range: Optional[tuple[datetime, datetime]] = None
    ) -> List[EmailMessage]:
        """
        Search for emails using Gmail search query syntax
        
        Args:
            query: Gmail search query (e.g., "from:example.com project")
            max_results: Maximum number of emails to return
            date_range: Optional tuple of (start_date, end_date)
            
        Returns:
            List of EmailMessage objects
        """
        try:
            # Build search query with date range if provided
            search_query = query
            if date_range:
                start_date, end_date = date_range
                search_query += f" after:{start_date.strftime('%Y/%m/%d')}"
                search_query += f" before:{end_date.strftime('%Y/%m/%d')}"
            
            # Search for message IDs
            results = self.service.users().messages().list(
                userId='me',
                q=search_query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            
            # Fetch full message details
            email_messages = []
            for msg in messages:
                message_detail = self._get_message_detail(msg['id'])
                if message_detail:
                    email_messages.append(message_detail)
            
            return email_messages
            
        except HttpError as error:
            raise ValueError(f"Gmail API error: {error}")
    
    def get_threads(
        self, 
        query: str, 
        max_results: int = 20,
        date_range: Optional[tuple[datetime, datetime]] = None
    ) -> List[EmailThread]:
        """
        Get email threads (conversations) matching the query
        
        Args:
            query: Gmail search query
            max_results: Maximum number of threads to return
            date_range: Optional tuple of (start_date, end_date)
            
        Returns:
            List of EmailThread objects
        """
        try:
            # Build search query with date range if provided
            search_query = query
            if date_range:
                start_date, end_date = date_range
                search_query += f" after:{start_date.strftime('%Y/%m/%d')}"
                search_query += f" before:{end_date.strftime('%Y/%m/%d')}"
            
            # Search for thread IDs
            results = self.service.users().threads().list(
                userId='me',
                q=search_query,
                maxResults=max_results
            ).execute()
            
            threads = results.get('threads', [])
            
            # Fetch full thread details
            email_threads = []
            for thread in threads:
                thread_detail = self._get_thread_detail(thread['id'])
                if thread_detail:
                    email_threads.append(thread_detail)
            
            return email_threads
            
        except HttpError as error:
            raise ValueError(f"Gmail API error: {error}")
    
    def _get_message_detail(self, message_id: str) -> Optional[EmailMessage]:
        """Get detailed information for a specific message"""
        try:
            message = self.service.users().messages().get(
                userId='me', 
                id=message_id
            ).execute()
            
            return self._parse_message(message)
            
        except HttpError:
            return None
    
    def _get_thread_detail(self, thread_id: str) -> Optional[EmailThread]:
        """Get detailed information for a specific thread"""
        try:
            thread = self.service.users().threads().get(
                userId='me', 
                id=thread_id
            ).execute()
            
            return self._parse_thread(thread)
            
        except HttpError:
            return None
    
    def _parse_message(self, message: Dict) -> EmailMessage:
        """Parse Gmail API message response into EmailMessage object"""
        payload = message['payload']
        headers = {h['name'].lower(): h['value'] for h in payload.get('headers', [])}
        
        # Extract basic information
        subject = headers.get('subject', 'No Subject')
        sender = headers.get('from', 'Unknown Sender')
        recipient = headers.get('to', 'Unknown Recipient')
        date_str = headers.get('date', '')
        
        # Parse date
        date = self._parse_email_date(date_str)
        
        # Extract body content
        body_text, body_html = self._extract_body_content(payload)
        
        # Extract labels
        labels = message.get('labelIds', [])
        
        # Extract attachments info
        attachments = self._extract_attachments_info(payload)
        
        return EmailMessage(
            id=message['id'],
            thread_id=message['threadId'],
            subject=subject,
            sender=sender,
            recipient=recipient,
            date=date,
            snippet=message.get('snippet', ''),
            body_text=body_text,
            body_html=body_html,
            labels=labels,
            attachments=attachments
        )
    
    def _parse_thread(self, thread: Dict) -> EmailThread:
        """Parse Gmail API thread response into EmailThread object"""
        messages = []
        participants = set()
        labels = set()
        last_date = datetime.min
        
        # Parse all messages in the thread
        for msg in thread.get('messages', []):
            email_message = self._parse_message(msg)
            messages.append(email_message)
            
            # Collect participants
            participants.add(email_message.sender)
            participants.add(email_message.recipient)
            
            # Collect labels
            labels.update(email_message.labels)
            
            # Track latest date
            if email_message.date > last_date:
                last_date = email_message.date
        
        # Get subject from first message
        subject = messages[0].subject if messages else "No Subject"
        
        return EmailThread(
            id=thread['id'],
            subject=subject,
            participants=list(participants),
            message_count=len(messages),
            last_message_date=last_date,
            messages=messages,
            labels=list(labels)
        )
    
    def _extract_body_content(self, payload: Dict) -> tuple[str, str]:
        """Extract text and HTML content from message payload"""
        text_content = ""
        html_content = ""
        
        def extract_from_part(part):
            nonlocal text_content, html_content
            
            mime_type = part.get('mimeType', '')
            
            if mime_type == 'text/plain':
                data = part.get('body', {}).get('data', '')
                if data:
                    text_content += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            elif mime_type == 'text/html':
                data = part.get('body', {}).get('data', '')
                if data:
                    html_content += base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
            elif 'parts' in part:
                for subpart in part['parts']:
                    extract_from_part(subpart)
        
        if 'parts' in payload:
            for part in payload['parts']:
                extract_from_part(part)
        else:
            extract_from_part(payload)
        
        # Clean up HTML content and extract text if no plain text available
        if not text_content and html_content:
            text_content = self._html_to_text(html_content)
        
        return text_content, html_content
    
    def _extract_attachments_info(self, payload: Dict) -> List[Dict[str, Any]]:
        """Extract attachment information from message payload"""
        attachments = []
        
        def extract_from_part(part):
            if part.get('filename'):
                attachment = {
                    'filename': part['filename'],
                    'mime_type': part.get('mimeType', ''),
                    'size': part.get('body', {}).get('size', 0),
                    'attachment_id': part.get('body', {}).get('attachmentId', '')
                }
                attachments.append(attachment)
            
            if 'parts' in part:
                for subpart in part['parts']:
                    extract_from_part(subpart)
        
        if 'parts' in payload:
            for part in payload['parts']:
                extract_from_part(part)
        
        return attachments
    
    def _parse_email_date(self, date_str: str) -> datetime:
        """Parse email date string into datetime object"""
        if not date_str:
            return datetime.now()
        
        try:
            # Parse RFC 2822 date format
            parsed = email.utils.parsedate_tz(date_str)
            if parsed:
                timestamp = email.utils.mktime_tz(parsed)
                return datetime.fromtimestamp(timestamp)
        except (ValueError, TypeError):
            pass
        
        return datetime.now()
    
    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML content to plain text"""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html_content)
        # Decode HTML entities
        text = html.unescape(text)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def get_project_emails(
        self, 
        project_keywords: List[str],
        participant_emails: List[str],
        date_range: tuple[datetime, datetime],
        max_results: int = 100
    ) -> Dict[str, Any]:
        """
        Get emails related to a specific project
        
        Args:
            project_keywords: List of keywords to search for
            participant_emails: List of email addresses of project participants
            date_range: Tuple of (start_date, end_date)
            max_results: Maximum number of emails to return
            
        Returns:
            Dictionary containing emails, threads, and metadata
        """
        try:
            # Build search query
            keyword_query = " OR ".join([f'"{keyword}"' for keyword in project_keywords])
            participant_query = " OR ".join([f"from:{email}" for email in participant_emails])
            participant_query += " OR " + " OR ".join([f"to:{email}" for email in participant_emails])
            
            query = f"({keyword_query}) AND ({participant_query})"
            
            # Fetch emails and threads
            emails = self.search_emails(query, max_results, date_range)
            threads = self.get_threads(query, max_results // 2, date_range)
            
            # Calculate statistics
            total_emails = len(emails)
            unique_participants = set()
            date_range_actual = None
            
            if emails:
                dates = [email.date for email in emails]
                date_range_actual = (min(dates), max(dates))
                
                for email in emails:
                    unique_participants.add(email.sender)
                    unique_participants.add(email.recipient)
            
            return {
                'emails': [self._email_to_dict(email) for email in emails],
                'threads': [self._thread_to_dict(thread) for thread in threads],
                'metadata': {
                    'total_emails': total_emails,
                    'total_threads': len(threads),
                    'unique_participants': list(unique_participants),
                    'date_range': {
                        'start': date_range_actual[0].isoformat() if date_range_actual else None,
                        'end': date_range_actual[1].isoformat() if date_range_actual else None
                    },
                    'keywords_used': project_keywords,
                    'search_query': query
                }
            }
            
        except Exception as e:
            raise ValueError(f"Failed to fetch project emails: {str(e)}")
    
    def _email_to_dict(self, email: EmailMessage) -> Dict[str, Any]:
        """Convert EmailMessage to dictionary for JSON serialization"""
        return {
            'id': email.id,
            'thread_id': email.thread_id,
            'subject': email.subject,
            'sender': email.sender,
            'recipient': email.recipient,
            'date': email.date.isoformat(),
            'snippet': email.snippet,
            'body_text': email.body_text[:1000] + "..." if len(email.body_text) > 1000 else email.body_text,
            'body_html': email.body_html[:1000] + "..." if len(email.body_html) > 1000 else email.body_html,
            'labels': email.labels,
            'attachments': email.attachments
        }
    
    def _thread_to_dict(self, thread: EmailThread) -> Dict[str, Any]:
        """Convert EmailThread to dictionary for JSON serialization"""
        return {
            'id': thread.id,
            'subject': thread.subject,
            'participants': thread.participants,
            'message_count': thread.message_count,
            'last_message_date': thread.last_message_date.isoformat(),
            'messages': [self._email_to_dict(msg) for msg in thread.messages],
            'labels': thread.labels
        }
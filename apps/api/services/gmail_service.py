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
import logging
from dataclasses import dataclass

from models.user import User

logger = logging.getLogger(__name__)


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
        max_results: int = 1000,
        date_range: Optional[tuple[datetime, datetime]] = None
    ) -> List[EmailMessage]:
        """
        Search for emails using Gmail search query syntax with pagination support
        
        Args:
            query: Gmail search query (e.g., "from:example.com project")
            max_results: Maximum number of emails to return (supports up to 500)
            date_range: Optional tuple of (start_date, end_date)
            
        Returns:
            List of EmailMessage objects
        """
        logger.info(f"📧 Starting email search for user {self.user.email}")
        logger.info(f"   Query: '{query}' | Max results: {max_results}")
        if date_range:
            logger.info(f"   Date range: {date_range[0].strftime('%Y-%m-%d')} to {date_range[1].strftime('%Y-%m-%d')}")
        
        start_time = datetime.now()
        
        try:
            # Build search query with date range if provided
            search_query = query
            if date_range:
                start_date, end_date = date_range
                # Gmail date format: YYYY/MM/DD
                date_after = start_date.strftime('%Y/%m/%d')
                date_before = end_date.strftime('%Y/%m/%d')
                search_query += f" after:{date_after} before:{date_before}"
                logger.debug(f"   Applied date range: after:{date_after} before:{date_before}")
            
            logger.info(f"   Final query: '{search_query}'")
            
            # Gmail API single requests are limited to 100, use pagination for more
            # Use pagination for requests > 100
            if max_results <= 100:
                logger.info("   Using single-page search (≤100 results)")
                emails = self._search_emails_single_page(search_query, max_results)
            else:
                logger.info("   Using paginated search (>100 results)")
                emails = self._search_emails_paginated(search_query, max_results)
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Email search completed in {duration:.2f}s")
            logger.info(f"   Retrieved {len(emails)} emails")
            
            if emails:
                # Log sample of results
                logger.info(f"   First email: '{emails[0].subject[:50]}...' from {emails[0].sender}")
                logger.info(f"   Last email: '{emails[-1].subject[:50]}...' from {emails[-1].sender}")
                logger.info(f"   Date span: {emails[-1].date.strftime('%Y-%m-%d')} to {emails[0].date.strftime('%Y-%m-%d')}")
            
            return emails
            
        except HttpError as error:
            logger.error(f"❌ Gmail API error during search: {error}")
            raise ValueError(f"Gmail API error: {error}")
        except Exception as e:
            logger.error(f"❌ Unexpected error during email search: {str(e)}")
            raise
    
    def _search_emails_single_page(self, query: str, max_results: int) -> List[EmailMessage]:
        """Search emails in a single API call (max 100 results)"""
        logger.debug(f"   📄 Single page request: {max_results} emails")
        
        results = self.service.users().messages().list(
            userId='me',
            q=query,
            maxResults=min(max_results, 100)
        ).execute()
        
        messages = results.get('messages', [])
        logger.debug(f"   📄 Gmail API returned {len(messages)} message IDs")
        
        # Fetch full message details
        email_messages = []
        for i, msg in enumerate(messages):
            message_detail = self._get_message_detail(msg['id'])
            if message_detail:
                email_messages.append(message_detail)
                if (i + 1) % 20 == 0:  # Log progress every 20 emails
                    logger.debug(f"   📄 Processed {i + 1}/{len(messages)} emails")
        
        logger.debug(f"   📄 Successfully parsed {len(email_messages)} emails")
        return email_messages
    
    def _search_emails_paginated(self, query: str, max_results: int) -> List[EmailMessage]:
        """Search emails with pagination for > 100 results"""
        logger.info(f"   📚 Starting paginated search for {max_results} emails")
        
        all_messages = []
        next_page_token = None
        remaining_results = max_results  # No absolute limit with proper pagination
        page_count = 0
        
        while remaining_results > 0:
            page_count += 1
            # Calculate page size (max 100 per request)
            page_size = min(remaining_results, 100)
            
            logger.debug(f"   📚 Page {page_count}: requesting {page_size} emails")
            
            # Make API request
            request_params = {
                'userId': 'me',
                'q': query,
                'maxResults': page_size
            }
            
            if next_page_token:
                request_params['pageToken'] = next_page_token
            
            results = self.service.users().messages().list(**request_params).execute()
            
            messages = results.get('messages', [])
            if not messages:
                logger.debug(f"   📚 Page {page_count}: No more messages found")
                break
            
            logger.debug(f"   📚 Page {page_count}: Gmail API returned {len(messages)} message IDs")
            
            # Fetch full message details for this page
            page_start = len(all_messages)
            for msg in messages:
                if len(all_messages) >= max_results:
                    break
                    
                message_detail = self._get_message_detail(msg['id'])
                if message_detail:
                    all_messages.append(message_detail)
            
            page_end = len(all_messages)
            logger.debug(f"   📚 Page {page_count}: Processed {page_end - page_start} emails (total: {page_end})")
            
            # Check if we have more pages and need more results
            next_page_token = results.get('nextPageToken')
            if not next_page_token or len(all_messages) >= max_results:
                logger.debug(f"   📚 Pagination complete: {'no next page' if not next_page_token else 'reached max results'}")
                break
                
            remaining_results -= len(messages)
            
            # Add small delay to respect rate limits
            import time
            time.sleep(0.1)
            logger.debug(f"   📚 Rate limit delay applied (0.1s)")
        
        final_count = len(all_messages[:max_results])
        logger.info(f"   📚 Pagination completed: {final_count} emails across {page_count} pages")
        return all_messages[:max_results]
    
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
                # Gmail date format: YYYY/MM/DD
                date_after = start_date.strftime('%Y/%m/%d')
                date_before = end_date.strftime('%Y/%m/%d')
                search_query += f" after:{date_after} before:{date_before}"
            
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
        max_results: int = 1000
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
        logger.info(f"🎯 Starting project email retrieval")
        logger.info(f"   Keywords: {project_keywords}")
        logger.info(f"   Participants: {participant_emails}")
        logger.info(f"   Date range: {date_range[0].strftime('%Y-%m-%d')} to {date_range[1].strftime('%Y-%m-%d')}")
        logger.info(f"   Max results: {max_results}")
        
        start_time = datetime.now()
        
        try:
            # Build search query
            keyword_query = " OR ".join([f'"{keyword}"' for keyword in project_keywords])
            participant_query = " OR ".join([f"from:{email}" for email in participant_emails])
            participant_query += " OR " + " OR ".join([f"to:{email}" for email in participant_emails])
            
            query = f"({keyword_query}) AND ({participant_query})"
            logger.info(f"   Built search query: {query}")
            
            # Fetch emails and threads
            logger.info("   📧 Fetching project emails...")
            emails = self.search_emails(query, max_results, date_range)
            
            logger.info("   🧵 Fetching email threads...")
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
            
            # Log results summary
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Project email retrieval completed in {duration:.2f}s")
            logger.info(f"   📧 Total emails: {total_emails}")
            logger.info(f"   🧵 Total threads: {len(threads)}")
            logger.info(f"   👥 Unique participants: {len(unique_participants)}")
            
            if date_range_actual:
                logger.info(f"   📅 Actual date span: {date_range_actual[0].strftime('%Y-%m-%d')} to {date_range_actual[1].strftime('%Y-%m-%d')}")
            
            # Log participant breakdown
            if unique_participants:
                logger.info(f"   👥 Participants found: {', '.join(list(unique_participants)[:5])}")
                if len(unique_participants) > 5:
                    logger.info(f"   👥 ... and {len(unique_participants) - 5} more")
            
            result = {
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
                    'search_query': query,
                    'fetch_duration_seconds': duration
                }
            }
            
            logger.info(f"🎯 Project email data packaged for return: {len(result['emails'])} items")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch project emails: {str(e)}")
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
            'body_text': email.body_text[:3000] + "..." if len(email.body_text) > 3000 else email.body_text,
            'body_html': email.body_html[:3000] + "..." if len(email.body_html) > 3000 else email.body_html,
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

# Global service instance
_gmail_service_instance = None

def get_gmail_service(user: User) -> GmailService:
    """Get Gmail service instance for a specific user"""
    return GmailService(user)
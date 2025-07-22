"""
Unified Data Service

Wraps Gmail and Drive services to provide a unified interface for data fetching
"""

from typing import Dict, Any, List
from datetime import datetime
import logging

from .gmail_service import get_gmail_service
from .drive_service import get_drive_service
from ..models.user import User
from sqlmodel import Session

logger = logging.getLogger(__name__)

class UnifiedDataService:
    """Unified service for fetching data from multiple sources"""
    
    def __init__(self):
        pass
    
    async def fetch_all_project_data(
        self, 
        scope: Dict[str, Any], 
        user_id: int, 
        session: Session = None
    ) -> Dict[str, Any]:
        """
        Fetch data from all available sources for a project
        
        Args:
            scope: Project scope with keywords, participants, date range
            user_id: ID of the user requesting data
            session: Database session (if available)
            
        Returns:
            Dictionary with data from Gmail and Drive
        """
        result = {
            "data": {},
            "metadata": {
                "fetch_timestamp": datetime.utcnow().isoformat(),
                "sources_fetched": [],
                "total_items_fetched": 0
            },
            "errors": []
        }
        
        try:
            # Get Gmail data
            gmail_service = get_gmail_service()
            try:
                gmail_data = await gmail_service.get_project_emails(
                    project_keywords=scope.get("keywords", []),
                    participant_emails=scope.get("participant_emails", []),
                    date_range=(
                        datetime.fromisoformat(scope["start_date"]),
                        datetime.fromisoformat(scope["end_date"])
                    ),
                    user_id=user_id
                )
                result["data"]["gmail"] = gmail_data
                result["metadata"]["sources_fetched"].append("gmail")
                result["metadata"]["total_items_fetched"] += gmail_data.get("metadata", {}).get("total_emails", 0)
            except Exception as e:
                logger.error(f"Gmail fetch error: {str(e)}")
                result["errors"].append(f"Gmail: {str(e)}")
                
            # Get Drive data  
            drive_service = get_drive_service()
            try:
                drive_data = await drive_service.get_project_documents(
                    project_keywords=scope.get("keywords", []),
                    participant_emails=scope.get("participant_emails", []),
                    date_range=(
                        datetime.fromisoformat(scope["start_date"]),
                        datetime.fromisoformat(scope["end_date"])
                    ),
                    user_id=user_id
                )
                result["data"]["drive"] = drive_data
                result["metadata"]["sources_fetched"].append("drive")
                result["metadata"]["total_items_fetched"] += drive_data.get("metadata", {}).get("total_documents", 0)
            except Exception as e:
                logger.error(f"Drive fetch error: {str(e)}")
                result["errors"].append(f"Drive: {str(e)}")
                
        except Exception as e:
            logger.error(f"Data service error: {str(e)}")
            result["errors"].append(f"Service: {str(e)}")
        
        return result

# Global service instance
_data_service_instance = None

def get_data_service() -> UnifiedDataService:
    """Get the global unified data service instance"""
    global _data_service_instance
    if _data_service_instance is None:
        _data_service_instance = UnifiedDataService()
    return _data_service_instance
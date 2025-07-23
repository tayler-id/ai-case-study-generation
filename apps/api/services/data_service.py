"""
Unified Data Service

Wraps all connected services to provide a unified interface for data fetching
Uses the flexible service architecture to support unlimited data sources
"""

from typing import Dict, Any, List
from datetime import datetime
import logging
import uuid

from .service_registry import get_service
from .base_service import ServiceType, ProjectData
from models.user import User
from sqlmodel import Session

logger = logging.getLogger(__name__)

class UnifiedDataService:
    """Unified service for fetching data from multiple sources"""
    
    def __init__(self):
        pass
    
    async def fetch_all_project_data(
        self, 
        scope: Dict[str, Any], 
        user_id: uuid.UUID, 
        session: Session = None
    ) -> Dict[str, Any]:
        """
        Fetch data from all connected services for a project
        
        Args:
            scope: Project scope with keywords, participants, date range
            user_id: ID of the user requesting data
            session: Database session (if available)
            
        Returns:
            Dictionary with data from all connected services
        """
        logger.info(f"🔄 Starting unified data fetch for user {user_id}")
        logger.info(f"   Project: {scope.get('project_name', 'Unknown')}")
        logger.info(f"   Keywords: {scope.get('keywords', [])}")
        logger.info(f"   Participants: {scope.get('participant_emails', [])}")
        logger.info(f"   Date range: {scope.get('start_date', 'N/A')} to {scope.get('end_date', 'N/A')}")
        logger.info(f"   Max results: {scope.get('max_results', 100)}")
        
        start_time = datetime.utcnow()
        
        result = {
            "data": {},
            "metadata": {
                "fetch_timestamp": start_time.isoformat(),
                "sources_fetched": [],
                "total_items_fetched": 0
            },
            "errors": []
        }
        
        try:
            # Get user from database
            from repositories.user_repository import UserRepository
            user_repo = UserRepository(session)
            user = user_repo.get_user_by_id(user_id)
            if not user:
                logger.error(f"❌ User {user_id} not found")
                raise ValueError("User not found")
            
            logger.info(f"✅ Found user: {user.email}")
            
            # Get all connected services for this user
            connected_services = user.get_connected_services()
            logger.info(f"🔌 Connected services: {connected_services}")
            
            if not connected_services:
                logger.warning(f"⚠️  No connected services found for user {user_id}")
                return result
            
            # Fetch data from each connected service
            for service_name in connected_services:
                service_start_time = datetime.utcnow()
                logger.info(f"🔄 Processing service: {service_name}")
                
                try:
                    # Convert service name to ServiceType enum
                    service_type = ServiceType(service_name)
                    logger.debug(f"   Service type: {service_type.value}")
                    
                    # Get service instance
                    service = get_service(service_type, user)
                    if not service or not service.is_connected():
                        logger.warning(f"⚠️  Service {service_name} not available or not connected")
                        continue
                    
                    logger.info(f"   ✅ Service {service_name} is connected and ready")
                    
                    # Fetch project data from this service
                    logger.info(f"   📡 Fetching data from {service_name}...")
                    project_data = service.get_project_data(
                        project_keywords=scope.get("keywords", []),
                        participant_emails=scope.get("participant_emails", []),
                        date_range=(
                            datetime.fromisoformat(scope["start_date"]),
                            datetime.fromisoformat(scope["end_date"])
                        ),
                        max_results=scope.get("max_results", 500)
                    )
                    
                    service_duration = (datetime.utcnow() - service_start_time).total_seconds()
                    
                    # Add to results
                    result["data"][service_name] = {
                        "service_type": project_data.service_type.value,
                        "items": project_data.items,
                        "metadata": project_data.metadata,
                        "fetch_timestamp": project_data.fetch_timestamp.isoformat(),
                        "total_items": project_data.total_items,
                        "source_info": project_data.source_info,
                        "fetch_duration_seconds": service_duration
                    }
                    
                    result["metadata"]["sources_fetched"].append(service_name)
                    result["metadata"]["total_items_fetched"] += project_data.total_items
                    
                    logger.info(f"   ✅ Service {service_name} completed in {service_duration:.2f}s")
                    logger.info(f"   📊 Items fetched: {project_data.total_items}")
                    
                    # Log sample items if available
                    if project_data.items and len(project_data.items) > 0:
                        sample_item = project_data.items[0]
                        if isinstance(sample_item, dict):
                            sample_info = sample_item.get('subject', sample_item.get('title', 'Unknown'))
                            logger.info(f"   📝 Sample item: {sample_info[:50]}...")
                    
                except Exception as e:
                    service_duration = (datetime.utcnow() - service_start_time).total_seconds()
                    logger.error(f"   ❌ Error fetching from {service_name} after {service_duration:.2f}s: {str(e)}")
                    result["errors"].append(f"{service_name}: {str(e)}")
            
            # Final summary
            total_duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"🏁 Unified data fetch completed in {total_duration:.2f}s")
            logger.info(f"   ✅ Services fetched: {len(result['metadata']['sources_fetched'])}")
            logger.info(f"   📊 Total items: {result['metadata']['total_items_fetched']}")
            logger.info(f"   ❌ Errors: {len(result['errors'])}")
            
            if result["errors"]:
                logger.warning(f"   ⚠️  Errors encountered: {result['errors']}")
            
            result["metadata"]["total_fetch_duration_seconds"] = total_duration
                    
        except Exception as e:
            total_duration = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"❌ Data service error after {total_duration:.2f}s: {str(e)}")
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
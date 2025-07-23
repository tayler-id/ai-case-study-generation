"""
Service Package Initialization
Handles automatic service registration and discovery
"""

from .service_registry import service_registry, register_service
from .base_service import ServiceType
from .gmail_service_v2 import GmailServiceV2
from .confluence_service import ConfluenceService
from .drive_service import DriveService

def initialize_services():
    """Initialize and register all available services"""
    
    # Register Gmail service
    register_service(
        ServiceType.GMAIL,
        GmailServiceV2,
        config={
            "name": "Gmail",
            "description": "Google Gmail email service",
            "auth_type": "oauth",
            "capabilities": ["email", "search", "threads"],
            "status": "production"
        }
    )
    
    # Register Drive service
    register_service(
        ServiceType.DRIVE,
        DriveService,
        config={
            "name": "Google Drive",
            "description": "Google Drive document service",
            "auth_type": "oauth",
            "capabilities": ["documents", "files", "search"],
            "status": "production"
        }
    )
    
    # Register Confluence service (template/example)
    register_service(
        ServiceType.CONFLUENCE,
        ConfluenceService,
        config={
            "name": "Confluence",
            "description": "Atlassian Confluence documentation service", 
            "auth_type": "oauth",
            "capabilities": ["documents", "projects", "search"],
            "status": "development"
        }
    )
    
    print(f"✅ Registered {len(service_registry.get_available_services())} services")
    for service_type in service_registry.get_available_services():
        config = service_registry.get_service_config(service_type)
        print(f"   - {config.get('name', service_type.value)}: {config.get('status', 'unknown')}")

# Initialize services when module is imported
initialize_services()
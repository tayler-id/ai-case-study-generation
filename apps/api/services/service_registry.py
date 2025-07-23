"""
Service Registry and Factory
Manages all available services and provides factory methods for creating service instances
"""

from typing import Dict, List, Type, Optional
from models.user import User
from .base_service import BaseService, ServiceType


class ServiceRegistry:
    """Registry for all available services"""
    
    def __init__(self):
        self._services: Dict[ServiceType, Type[BaseService]] = {}
        self._service_configs: Dict[ServiceType, Dict] = {}
    
    def register_service(self, service_type: ServiceType, service_class: Type[BaseService], config: Dict = None):
        """Register a new service type"""
        self._services[service_type] = service_class
        self._service_configs[service_type] = config or {}
    
    def get_available_services(self) -> List[ServiceType]:
        """Get list of all registered services"""
        return list(self._services.keys())
    
    def get_service_class(self, service_type: ServiceType) -> Optional[Type[BaseService]]:
        """Get service class for a given type"""
        return self._services.get(service_type)
    
    def get_service_config(self, service_type: ServiceType) -> Dict:
        """Get configuration for a service"""
        return self._service_configs.get(service_type, {})
    
    def create_service(self, service_type: ServiceType, user: User) -> Optional[BaseService]:
        """Factory method to create a service instance"""
        service_class = self._services.get(service_type)
        if not service_class:
            return None
        
        return service_class(user, service_type)
    
    def get_oauth_services(self) -> List[ServiceType]:
        """Get all OAuth-based services"""
        oauth_services = []
        for service_type, service_class in self._services.items():
            # Check if class inherits from OAuthService
            from .base_service import OAuthService
            if issubclass(service_class, OAuthService):
                oauth_services.append(service_type)
        return oauth_services
    
    def get_api_key_services(self) -> List[ServiceType]:
        """Get all API key-based services"""
        api_services = []
        for service_type, service_class in self._services.items():
            # Check if class inherits from APIKeyService
            from .base_service import APIKeyService
            if issubclass(service_class, APIKeyService):
                api_services.append(service_type)
        return api_services
    
    def get_all_oauth_scopes(self, service_types: List[ServiceType] = None) -> List[str]:
        """Get all OAuth scopes for specified services (or all OAuth services)"""
        if service_types is None:
            service_types = self.get_oauth_services()
        
        all_scopes = set()
        
        # We need a dummy user to get scopes - this is a limitation we might need to address
        for service_type in service_types:
            if service_type in self._services:
                service_class = self._services[service_type]
                # Create temporary instance to get scopes
                from .base_service import OAuthService
                if issubclass(service_class, OAuthService):
                    try:
                        # This is a hack - we might need to refactor to make scopes static
                        temp_service = service_class(None, service_type)
                        scopes = temp_service.get_oauth_scopes()
                        all_scopes.update(scopes)
                    except:
                        # If we can't create instance, skip
                        pass
        
        return list(all_scopes)


# Global service registry instance
service_registry = ServiceRegistry()


# Helper functions
def get_service(service_type: ServiceType, user: User) -> Optional[BaseService]:
    """Convenience function to get a service instance"""
    return service_registry.create_service(service_type, user)


def get_available_services() -> List[ServiceType]:
    """Convenience function to get available services"""
    return service_registry.get_available_services()


def register_service(service_type: ServiceType, service_class: Type[BaseService], config: Dict = None):
    """Convenience function to register a service"""
    service_registry.register_service(service_type, service_class, config)
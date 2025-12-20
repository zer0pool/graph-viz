"""
User Management Domain Container.

Provides services for user profile and authentication management.
Uses DependenciesContainer for database session (from CoreContainer).
"""

from dependency_injector import containers, providers

from lineage_manager.core.uow import UserUnitOfWork
from lineage_manager.services.user_service import UserService


class UserContainer(containers.DeclarativeContainer):
    """User management domain container."""
    
    # Dependencies from CoreContainer (for database session)
    core = providers.DependenciesContainer()
    
    # Unit of Work
    uow = providers.Factory(
        UserUnitOfWork,
        db=core.session_factory,
    )
    
    # Service with direct repository injection
    user_service = providers.Factory(
        UserService,
        uow=uow,
    )

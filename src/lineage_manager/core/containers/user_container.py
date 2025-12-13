"""
User Management Domain Container.

Provides services for user profile and authentication management.
Uses DependenciesContainer for database session (from CoreContainer).
"""

from dependency_injector import containers, providers

from lineage_manager.repositories.user_repository import UserRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.services.user_service import UserService


class UserContainer(containers.DeclarativeContainer):
    """User management domain container."""
    
    # Dependencies from CoreContainer (for database session)
    core = providers.DependenciesContainer()
    
    # Repositories with direct session injection
    user_repository = providers.Factory(
        UserRepository,
        db=core.session_factory,
    )
    
    job_repository = providers.Factory(
        JobRepository,
        db=core.session_factory,
    )
    
    # Service with direct repository injection
    user_service = providers.Factory(
        UserService,
        user_repository=user_repository,
        job_repository=job_repository,
        session=core.session_factory,
    )

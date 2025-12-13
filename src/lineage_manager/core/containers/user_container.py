"""
User Management Domain Container.

Provides services for user profile and authentication management.
"""

from dependency_injector import containers, providers

from lineage_manager.repositories.user_repository import UserRepository
from lineage_manager.repositories.job_repository import JobRepository
from lineage_manager.services.user_service import UserService


class UserContainer(containers.DeclarativeContainer):
    """User management domain container."""
    
    # Dependencies from other containers
    core = providers.DependenciesContainer()
    
    # Repositories (direct injection - simpler than UoW for this domain)
    user_repository = providers.Factory(
        UserRepository,
        db=core.write_session,
    )
    
    job_repository = providers.Factory(
        JobRepository,
        db=core.read_session,  # Read-only for listing user's jobs
    )
    
    # Service with direct repository injection
    user_service = providers.Factory(
        UserService,
        user_repository=user_repository,
        job_repository=job_repository,
        session=core.write_session,
    )

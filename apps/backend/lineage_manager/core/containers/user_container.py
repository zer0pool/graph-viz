"""
User Management Domain Container.

Provides services for user profile and authentication management.
Uses DependenciesContainer for database session (from CoreContainer).
"""

from dependency_injector import containers, providers

from lineage_manager.core.uow import UserUnitOfWork
from lineage_manager.services.user_service import UserService
from lineage_manager.services.auth_service import AuthService


class UserContainer(containers.DeclarativeContainer):
    """User management domain container."""
    
    # Dependencies from CoreContainer (for database session)
    core = providers.DependenciesContainer()
    graph = providers.DependenciesContainer()  # For graph UoW
    
    # Unit of Work
    uow = providers.Factory(
        UserUnitOfWork,
        db=core.session_factory,
    )
    
    # Service with graph_uow for job queries
    user_service = providers.Factory(
        UserService,
        uow=uow,
        graph_uow=graph.write_uow,
    )

    # Auth Service
    auth_service = providers.Factory(
        AuthService,
        user_service=user_service,
        oidc_client=core.oidc_provider,
        redis_client=core.redis_client,
    )

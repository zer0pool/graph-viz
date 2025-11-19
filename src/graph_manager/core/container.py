from dependency_injector import containers, providers
from sqlalchemy.orm import Session, scoped_session

from graph_manager.adapters.job_manager_adapter import JobManagerAdapter
from graph_manager.core.auth import OIDCProviderClient
from graph_manager.core.database import Database, db
from graph_manager.core.uow import GraphUnitOfWork
from graph_manager.services.graph_service import GraphService
from graph_manager.services.graph_query_service import GraphQueryService
from graph_manager.services.graph_build_service import GraphBuildService
from graph_manager.services.user_service import UserService


class GraphContainer(containers.DeclarativeContainer):
    """Dependency injection container for graph management with proper session management."""

    wiring_config = containers.WiringConfiguration(
        packages=["graph_manager.api.v1.endpoints"]
    )

    # Configuration
    config = providers.Configuration()

    # Database
    database = providers.Singleton(Database)

    # Session maker for creating request-scoped sessions
    session_factory = providers.Singleton(lambda: db.session_maker)

    # Unit of Work with proper session management    
    uow = providers.Factory(GraphUnitOfWork, db=database.provided.session_maker)

    # Adapters
    job_manager_adapter = providers.Singleton(
        JobManagerAdapter, base_url=config.job_manager_url
    )

    # Core service (backward compat) and split services
    graph_service = providers.Factory(GraphService, uow=uow, job_manager=job_manager_adapter)
    graph_query_service = providers.Factory(GraphQueryService, uow=uow, core=graph_service)
    graph_build_service = providers.Factory(GraphBuildService, core=graph_service)
    user_service = providers.Factory(UserService, uow=uow)

    oidc_provider = providers.Singleton(
        OIDCProviderClient,
        issuer=config.oidc_issuer_url,
        client_id=config.oidc_client_id,
        client_secret=config.oidc_client_secret,
        redirect_uri=config.oidc_redirect_uri,
        audience=config.oidc_audience,
        scopes=config.oidc_scopes,
        cache_seconds=config.oidc_jwks_cache_seconds,
    )

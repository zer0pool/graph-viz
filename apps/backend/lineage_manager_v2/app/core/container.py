import redis
from dependency_injector import containers, providers

from app.core.auth import OIDCProviderClient
from app.core.config import settings
from app.infrastructure.database import create_session_factory
from app.infrastructure.external.job_manager_client import JobManagerClient
from app.infrastructure.unit_of_work import UnitOfWork
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.graph_service import GraphService
from app.services.metadata_service import MetadataService


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        packages=["app.api.v1.endpoints", "app.api.internal.v1.endpoints"]
    )

    # Infrastructure
    session_factory = providers.Singleton(
        create_session_factory, db_url=settings.DATABASE_URL
    )

    uow = providers.Factory(UnitOfWork, session_factory=session_factory)

    job_manager_client = providers.Singleton(
        JobManagerClient, base_url=settings.JOB_MANAGER_URL
    )

    redis_client = providers.Singleton(
        redis.from_url,
        url=settings.REDIS_URL,
        decode_responses=True,
    )

    oidc_client = providers.Singleton(
        OIDCProviderClient,
        issuer=settings.oidc.issuer_url,
        client_id=settings.oidc.client_id,
        client_secret=settings.oidc.client_secret,
        redirect_uri=settings.oidc.redirect_uri,
        audience=settings.oidc.audience,
        scopes=settings.oidc.scopes,
        cache_seconds=settings.oidc.jwks_cache_seconds,
    )

    # Services
    graph_service = providers.Factory(
        GraphService, uow=uow, job_manager_client=job_manager_client
    )

    audit_service = providers.Factory(AuditService, uow=uow)

    metadata_service = providers.Factory(
        MetadataService, uow=uow, audit_service=audit_service
    )

    auth_service = providers.Factory(
        AuthService,
        uow=uow,
        oidc_client=oidc_client,
        redis_client=redis_client,
    )

    analytics_service = providers.Factory(AnalyticsService, uow=uow)

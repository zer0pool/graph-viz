from dependency_injector import containers, providers
from app.core.config import settings
from app.infrastructure.database import create_session_factory
from app.infrastructure.external.job_manager_client import JobManagerClient
from app.infrastructure.unit_of_work import UnitOfWork
from app.services.graph_service import GraphService
from app.services.metadata_service import MetadataService
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(packages=["app.api.v1.endpoints"])

    # Infrastructure
    session_factory = providers.Singleton(
        create_session_factory, db_url=settings.DATABASE_URL
    )

    uow = providers.Factory(UnitOfWork, session_factory=session_factory)

    job_manager_client = providers.Singleton(
        JobManagerClient, base_url=settings.JOB_MANAGER_URL
    )

    # Services
    graph_service = providers.Factory(
        GraphService, uow=uow, job_manager_client=job_manager_client
    )

    metadata_service = providers.Factory(MetadataService, uow=uow)

    audit_service = providers.Factory(AuditService, uow=uow)

    auth_service = providers.Factory(AuthService, uow=uow)

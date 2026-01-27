"""
Job Manager Domain Container.

Provides services for interacting with external Job Manager.
Uses get_settings() directly for configuration.
"""

from dependency_injector import containers, providers

from lineage_manager.core.config import get_settings
from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.services.job_service import JobService


from lineage_manager.core.uow import GraphUnitOfWork


# Get settings at import time (cached singleton)
_settings = get_settings()


class JobContainer(containers.DeclarativeContainer):
    """Job Manager domain container."""
    
    core = providers.DependenciesContainer()

    # Adapter - uses settings directly (no DependenciesContainer needed!)
    job_manager_adapter = providers.Singleton(
        JobManagerAdapter,
        base_url=_settings.job_manager_url,
    )
    
    # Service
    job_service = providers.Factory(
        JobService,
        job_manager=job_manager_adapter,
        graph_uow=providers.Factory(
            GraphUnitOfWork,
            db=core.session_factory,
        ),
    )

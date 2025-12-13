"""
Job Manager Domain Container.

Provides services for interacting with external Job Manager.
"""

from dependency_injector import containers, providers

from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.services.job_service import JobService


class JobContainer(containers.DeclarativeContainer):
    """Job Manager domain container."""
    
    # Dependencies from other containers
    core = providers.DependenciesContainer()
    
    # Adapter (External Integration)
    job_manager_adapter = providers.Singleton(
        JobManagerAdapter,
        base_url=core.config.provided.job_manager_url,
    )
    
    # Service (no DB access - external API only)
    job_service = providers.Factory(
        JobService,
        job_manager=job_manager_adapter,
    )


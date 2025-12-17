"""
Graph Domain Container.

Provides services for graph lineage data management.
Uses DependenciesContainer for database session and job_manager adapter.
"""

from dependency_injector import containers, providers

from lineage_manager.core.uow import GraphUnitOfWork, GraphReadOnlyUnitOfWork

from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_sync_service import GraphSyncService
from lineage_manager.services.graph_initializer import GraphInitializerService


class GraphContainer(containers.DeclarativeContainer):
    """Graph domain container for lineage graph management."""
    
    # Dependencies from other containers
    core = providers.DependenciesContainer()  # For database
    job = providers.DependenciesContainer()   # For job_manager_adapter
    
    # Write UoW (for mutations)
    write_uow = providers.Factory(
        GraphUnitOfWork,
        db=core.session_factory,
    )
    
    # Read UoW (for queries) - can use read replica later
    read_uow = providers.Factory(
        GraphReadOnlyUnitOfWork,
        db=core.read_session_factory,
    )
    
    # Main Graph Service (backward compatibility)
    # Graph Services
    # Query Service (uses read UoW)
    query_service = providers.Factory(
        GraphQueryService,
        uow=write_uow,  # Temporarily use write_uow for backward compat
    )

    # Command Service (mutations)
    command_service = providers.Factory(
        GraphCommandService,
        uow=write_uow,
        job_manager=job.job_manager_adapter,
        query_service=query_service,
    )
    
    # Initializer Service
    initializer_service = providers.Factory(
        GraphInitializerService,
        job_manager=job.job_manager_adapter,
        command_service=command_service,
        query_service=query_service,
    )

    # Sync Service
    sync_service = providers.Factory(
        GraphSyncService,
        uow=write_uow,
        job_manager=job.job_manager_adapter,
        command_service=command_service,
        query_service=query_service,
        initializer_service=initializer_service,
    )

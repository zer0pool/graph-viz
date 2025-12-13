"""
Graph Domain Container.

Provides services for graph lineage data management.
"""

from dependency_injector import containers, providers

from lineage_manager.core.uow import GraphUnitOfWork, GraphReadOnlyUnitOfWork
from lineage_manager.services.graph_service import GraphService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_initializer import GraphInitializerService


class GraphContainer(containers.DeclarativeContainer):
    """Graph domain container for lineage graph management."""
    
    # Dependencies from other containers
    core = providers.DependenciesContainer()
    job = providers.DependenciesContainer()
    
    # Write UoW (for mutations)
    write_uow = providers.Factory(
        GraphUnitOfWork,
        db=core.write_session_factory,
    )
    
    # Read UoW (for queries)
    read_uow = providers.Factory(
        GraphReadOnlyUnitOfWork,
        db=core.read_session_factory,
    )
    
    # Backward compatibility - keep existing GraphService temporarily
    graph_service = providers.Factory(
        GraphService,
        uow=write_uow,
        job_manager=job.job_manager_adapter,
    )
    
    # Query Service (uses read UoW)
    query_service = providers.Factory(
        GraphQueryService,
        uow=read_uow,
        core=graph_service,  # Temporary - for backward compat
    )
    
    # Initializer Service
    initializer_service = providers.Factory(
        GraphInitializerService,
        job_manager=job.job_manager_adapter,
        graph_service=graph_service,
    )

"""
Application Container.

Root container that wires all domain containers together.
"""

from dependency_injector import containers, providers

from lineage_manager.core.containers.core_container import CoreContainer
from lineage_manager.core.containers.job_container import JobContainer
from lineage_manager.core.containers.user_container import UserContainer
from lineage_manager.core.containers.bigquery_container import BigQueryContainer
from lineage_manager.core.containers.graph_container import GraphContainer as GraphDomainContainer


class ApplicationContainer(containers.DeclarativeContainer):
    """Root application container that wires all domain containers."""
    
    wiring_config = containers.WiringConfiguration(
        packages=["lineage_manager.api.v1.endpoints"]
    )
    
    # Core infrastructure
    core = providers.Container(CoreContainer)
    
    # Domain containers
    job = providers.Container(
        JobContainer,
        core=core,
    )
    
    user = providers.Container(
        UserContainer,
        core=core,
    )
    
    bigquery = providers.Container(
        BigQueryContainer,
        core=core,
    )
    
    graph = providers.Container(
        GraphDomainContainer,
        core=core,
        job=job,
    )


# Backward compatibility - expose old GraphContainer name
GraphContainer = ApplicationContainer


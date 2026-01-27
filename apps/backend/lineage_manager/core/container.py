"""
Application Container.

Root container that wires all domain containers together.
Each domain container uses get_settings() directly for configuration,
so we only need to pass provider dependencies (database, adapters) between containers.
"""

from dependency_injector import containers, providers

from lineage_manager.core.containers.core_container import CoreContainer
from lineage_manager.core.containers.job_container import JobContainer
from lineage_manager.core.containers.user_container import UserContainer
from lineage_manager.core.containers.bigquery_container import BigQueryContainer
from lineage_manager.core.containers.table_container import TableContainer
from lineage_manager.core.containers.graph_container import GraphContainer as GraphDomainContainer
from lineage_manager.core.containers.audit_container import AuditContainer


class ApplicationContainer(containers.DeclarativeContainer):
    """Root application container that wires all domain containers."""
    
    wiring_config = containers.WiringConfiguration(
        packages=["lineage_manager.api.v1.endpoints"]
    )
    
    # ─────────────────────────────────────────────────────
    # Core infrastructure (database, auth)
    # ─────────────────────────────────────────────────────
    core = providers.Container(CoreContainer)
    
    # ─────────────────────────────────────────────────────
    # Domain containers
    # ─────────────────────────────────────────────────────
    
    # Job domain (no dependencies needed - uses settings directly)
    job = providers.Container(JobContainer)
    
    # Graph domain (needs database from core, adapter from job)
    graph = providers.Container(
        GraphDomainContainer,
        core=core,
        job=job,
    )

    # User domain (needs database from core and graph UoW)
    user = providers.Container(
        UserContainer,
        core=core,
        graph=graph,
    )
    
    # BigQuery domain (no dependencies needed)
    bigquery = providers.Container(BigQueryContainer)

    # Table domain (needs graph services and bigquery service)
    table = providers.Container(
        TableContainer,
        graph=graph,
        bigquery=bigquery,
    )
    
    # Audit domain (needs core database and graph services)
    audit = providers.Container(
        AuditContainer,
        core=core,
        graph=graph,
    )


# Backward compatibility - expose old GraphContainer name
GraphContainer = ApplicationContainer

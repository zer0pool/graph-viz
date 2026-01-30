"""
Table Domain Container.

Provides services for table-related operations.
"""

from dependency_injector import containers, providers

from lineage_manager.services.table_service import TableService


class TableContainer(containers.DeclarativeContainer):
    """Table domain container."""

    # Dependencies from other containers
    graph = providers.DependenciesContainer()
    bigquery = providers.DependenciesContainer()

    # Service
    table_service = providers.Factory(
        TableService,
        query_service=graph.query_service,
        command_service=graph.command_service,
        bigquery_service=bigquery.bigquery_service,
    )

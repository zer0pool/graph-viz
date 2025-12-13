"""
BigQuery Integration Domain Container.

Provides services for BigQuery metadata and timeliness queries.
"""

from dependency_injector import containers, providers

from lineage_manager.services.bigquery_service import BigQueryService


class BigQueryContainer(containers.DeclarativeContainer):
    """BigQuery integration domain container."""
    
    # Dependencies from other containers
    core = providers.DependenciesContainer()
    
    # Service (no DB access - uses Google Cloud credentials)
    bigquery_service = providers.Factory(BigQueryService)

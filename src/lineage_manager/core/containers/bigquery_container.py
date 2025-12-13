"""
BigQuery Integration Domain Container.

Provides services for BigQuery metadata and timeliness queries.
No configuration needed - uses Google Cloud credentials from environment.
"""

from dependency_injector import containers, providers

from lineage_manager.services.bigquery_service import BigQueryService


class BigQueryContainer(containers.DeclarativeContainer):
    """BigQuery integration domain container."""
    
    # Service (no DB or config needed - uses GCP environment credentials)
    bigquery_service = providers.Factory(BigQueryService)

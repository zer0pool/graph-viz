"""
BigQuery Integration Domain Container.

Provides services for BigQuery metadata and timelines queries.
Uses Selector pattern to choose between Real (production) and Dummy (test/dev) implementations
based on the enable_bigquery feature flag.
"""

from dependency_injector import containers, providers

from lineage_manager.services.real_bigquery_service import RealBigQueryService
from lineage_manager.services.dummy_bigquery_service import DummyBigQueryService
from lineage_manager.core.config import get_settings


class BigQueryContainer(containers.DeclarativeContainer):
    """BigQuery integration domain container.

    Uses Selector to choose implementation based on enable_bigquery flag:
    - enable_bigquery=True  -> RealBigQueryService (production GCP integration)
    - enable_bigquery=False -> DummyBigQueryService (test/dev deterministic data)
    """

    settings = providers.Dependency()

    # Selector chooses implementation based on enable_bigquery flag
    # This is the ONLY place where enable_bigquery should be checked
    bigquery_service = providers.Selector(
        lambda: "real" if get_settings().feature_flags.enable_bigquery else "dummy",
        real=providers.Factory(
            RealBigQueryService,
            history_table=get_settings().feature_flags.history_table,
        ),
        dummy=providers.Factory(DummyBigQueryService),
    )

from dependency_injector import containers, providers

from app.core.config import settings
from app.infrastructure.gcp.client import GoogleCloudClient
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.infrastructure.lineage_client import LineageClient
from app.domain.analytics.repository import AnalyticsRepository
from app.domain.analytics.service import AnalyticsService
from app.domain.data_sync.service import DataSyncService
from app.domain.job_explorer.repository import JobExplorerRepository
from app.domain.job_explorer.service import JobExplorerService
from app.infrastructure.cache.redis import get_redis_client

from app.infrastructure.database import create_session_factory
# Analytics Manager may need its own services later


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(
        packages=["app.api.v1.endpoints", "app.api.graphql"]
    )

    # Infrastructure
    # Session factory for future DB use
    session_factory = providers.Singleton(create_session_factory, db_url=settings.DATABASE_URL)
    lineage_session_factory = providers.Singleton(create_session_factory, db_url=settings.LINEAGE_DATABASE_URL)

    # Redis
    redis_pool = providers.Resource(
        get_redis_client  # Factory function for async Redis client
    )

    # Google Cloud Client
    google_client = providers.Singleton(GoogleCloudClient)
    
    # BigQuery Client
    bq_client = providers.Singleton(BigQueryClient)

    # Lineage internal API client
    lineage_client = providers.Singleton(LineageClient)

    # Analytics Domain
    analytics_repository = providers.Factory(
        AnalyticsRepository,
        bq_client=bq_client,
        db_session_factory=lineage_session_factory
    )

    analytics_service = providers.Factory(
        AnalyticsService,
        repo=analytics_repository,
        lineage_client=lineage_client,
        redis=redis_pool
    )

    # Data Sync Domain
    sync_service = providers.Factory(
        DataSyncService,
        bq_client=bq_client,
        redis_client=redis_pool
    )

    # Job Explorer Domain
    job_explorer_repository = providers.Factory(
        JobExplorerRepository,
        bq_client=bq_client
    )

    job_explorer_service = providers.Factory(
        JobExplorerService,
        repo=job_explorer_repository,
        lineage_client=lineage_client,
        redis=redis_pool,
    )

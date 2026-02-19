from dependency_injector import containers, providers

from app.core.config import settings
from app.infrastructure.gcp.client import GoogleCloudClient
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.services.analytics_service import AnalyticsService
from app.infrastructure.cache.redis import get_redis_client  # Import Redis factory

# from app.infrastructure.database import create_session_factory
# from app.infrastructure.unit_of_work import UnitOfWork
# Metrics Manager may need its own services later


class Container(containers.DeclarativeContainer):
    wiring_config = containers.WiringConfiguration(packages=["app.api.v1.endpoints"])

    # Infrastructure
    # Session factory for future DB use
    # session_factory = providers.Singleton(create_session_factory, db_url=settings.DATABASE_URL)
    # uow = providers.Factory(UnitOfWork, session_factory=session_factory)

    # Redis
    redis_pool = providers.Resource(
        get_redis_client  # Factory function for async Redis client
    )

    # Google Cloud Client
    google_client = providers.Singleton(GoogleCloudClient)
    
    # BigQuery Client
    bq_client = providers.Singleton(BigQueryClient)

    # Services
    analytics_service = providers.Factory(
        AnalyticsService,
        bq_client=bq_client,
        redis=redis_pool
    )

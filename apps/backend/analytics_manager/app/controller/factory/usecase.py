from fastapi import Depends
from redis.asyncio import Redis

from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.application.usecase.analytics.get_top_visited import GetTopVisitedUseCase
from app.application.usecase.analytics.track_event import TrackEventUseCase
from app.application.usecase.data_sync.sync_data import SyncDataUseCase
from app.application.usecase.job_explorer.job_ranking import JobRankingUseCase
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase
from app.infrastructure.di.providers import get_bq_client, get_lineage_client, get_redis
from app.infrastructure.gateway.http_lineage_gateway import HttpLineageGateway
from app.infrastructure.gcp.bigquery import BigQueryClient
from app.infrastructure.lineage_client import LineageClient
from app.infrastructure.repository.bq_analytics_repository import (
    BigQueryAnalyticsRepository,
)
from app.infrastructure.repository.bq_job_repository import (
    BigQueryJobExplorerRepository,
)


def get_track_event_usecase() -> TrackEventUseCase:
    return TrackEventUseCase()


def get_metrics_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client),
    lineage_client: LineageClient = Depends(get_lineage_client),
    redis: Redis = Depends(get_redis),
) -> GetMetricsUseCase:
    repo = BigQueryAnalyticsRepository(bq_client)
    gateway = HttpLineageGateway(lineage_client)
    return GetMetricsUseCase(analytics_repo=repo, lineage_gateway=gateway, redis=redis)


def get_top_visited_usecase(
    lineage_client: LineageClient = Depends(get_lineage_client),
) -> GetTopVisitedUseCase:
    return GetTopVisitedUseCase(lineage_client=lineage_client)


def get_search_jobs_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client),
    lineage_client: LineageClient = Depends(get_lineage_client),
    redis: Redis = Depends(get_redis),
) -> SearchJobsUseCase:
    repo = BigQueryJobExplorerRepository(bq_client)
    gateway = HttpLineageGateway(lineage_client)
    return SearchJobsUseCase(repo=repo, lineage_gateway=gateway, redis=redis)


def get_job_ranking_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client),
    redis: Redis = Depends(get_redis),
) -> JobRankingUseCase:
    repo = BigQueryJobExplorerRepository(bq_client)
    return JobRankingUseCase(repo=repo, redis=redis)


def get_sync_data_usecase(
    bq_client: BigQueryClient = Depends(get_bq_client),
    redis: Redis = Depends(get_redis),
) -> SyncDataUseCase:
    return SyncDataUseCase(bq_client=bq_client, redis_client=redis)

"""
Application lifespan — startup and shutdown event handlers.
Kept separate from main.py to allow independent testing and extension.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

logger = logging.getLogger(__name__)


async def _warmup_jobs_cache() -> None:
    """Pre-populate the Redis job ranking cache on startup to avoid cold-start latency."""
    try:
        from app.application.usecase.job_explorer.search_jobs import \
            SearchJobsUseCase
        from app.core.redis import get_redis_client
        from app.infrastructure.gateway.http_lineage_gateway import \
            HttpLineageGateway
        from app.infrastructure.gcp.bigquery import BigQueryClient
        from app.infrastructure.lineage_client import LineageClient
        from app.infrastructure.repository.bq_job_repository import \
            BigQueryJobExplorerRepository

        bq_client = BigQueryClient()
        repo = BigQueryJobExplorerRepository(bq_client)
        lineage_client = LineageClient()
        lineage_gateway = HttpLineageGateway(lineage_client)
        redis = await get_redis_client()

        uc = SearchJobsUseCase(repo, lineage_gateway, redis)

        logger.info("[Lifespan] Starting cache warming for jobs explorer (30 days)...")
        await uc.execute(days=30, refresh=True)
        logger.info("[Lifespan] Jobs explorer cache warming completed.")
    except Exception as e:
        logger.error(f"[Lifespan] Failed to warmup jobs cache: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_warmup_jobs_cache())
    yield
    # Shutdown: add cleanup logic here (e.g. close connection pools)

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from strawberry.fastapi import GraphQLRouter

from app.api.graphql.resolvers import schema
from app.api.v1.endpoints import health  # System/health routes remain standard
from app.application.usecase.analytics.get_metrics import GetMetricsUseCase
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase
from app.controller.factory.usecase import (get_metrics_usecase,
                                            get_search_jobs_usecase)
from app.controller.router import analytics, metrics
import asyncio
import logging
from app.core.config import settings
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase

class DynamicRootPathMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            if b"x-forwarded-prefix" in headers:
                scope["root_path"] = headers[b"x-forwarded-prefix"].decode()
            elif scope["path"].startswith("/analytics-manager"):
                scope["path"] = scope["path"][len("/analytics-manager") :]
                scope["root_path"] = "/analytics-manager"

        return await self.app(scope, receive, send)


def create_app() -> FastAPI:
    async def warmup_jobs_cache():
        try:
            from app.infrastructure.repository.bq_job_repository import BigQueryJobExplorerRepository
            from app.infrastructure.gcp.bigquery import BigQueryClient
            from app.infrastructure.gateway.http_lineage_gateway import HttpLineageGateway
            from app.infrastructure.lineage_client import LineageClient
            from app.core.redis import get_redis_client
            
            bq_client = BigQueryClient()
            repo = BigQueryJobExplorerRepository(bq_client)
            lineage_client = LineageClient()
            lineage_gateway = HttpLineageGateway(lineage_client)
            redis = await get_redis_client()
            
            uc = SearchJobsUseCase(repo, lineage_gateway, redis)
            
            logging.info("Starting cache warming for jobs explorer (30 days)...")
            await uc.execute(days=30, refresh=True)
            logging.info("Jobs explorer cache warming completed.")
        except Exception as e:
            logging.error(f"Failed to warmup jobs cache: {e}")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup resources (e.g. connections) handled by external lifecycle/providers
        asyncio.create_task(warmup_jobs_cache())
        yield
        # Shutdown logic

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(DynamicRootPathMiddleware)

    # REST Routers
    app.include_router(health.router, prefix=settings.API_V1_STR, tags=["System"])
    app.include_router(
        analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"]
    )
    app.include_router(
        metrics.router, prefix=f"{settings.API_V1_STR}/metrics", tags=["Metrics"]
    )

    # GraphQL Router (Strawberry) - Context Injection
    async def get_context(
        metrics_uc: GetMetricsUseCase = Depends(get_metrics_usecase),
        jobs_uc: SearchJobsUseCase = Depends(get_search_jobs_usecase),
    ) -> dict:
        return {"metrics_uc": metrics_uc, "jobs_uc": jobs_uc}

    graphql_router = GraphQLRouter(schema, graphql_ide="apollo-sandbox", context_getter=get_context)  # type: ignore
    app.include_router(graphql_router, prefix="/graphql", tags=["GraphQL"])

    @app.get("/")
    async def root():
        return {"message": "Analytics Manager Service is running"}

    return app


app = create_app()

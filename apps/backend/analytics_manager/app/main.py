from contextlib import asynccontextmanager
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from app.api.graphql.resolvers import schema
from app.api.v1.endpoints import analytics, health, metrics
from app.core.config import settings
from app.core.container import Container


def create_app() -> FastAPI:
    container = Container()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await container.init_resources()
        yield
        await container.shutdown_resources()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        root_path="/admin-console/analytics-manager",
        servers=[{"url": "/admin-console/analytics-manager", "description": "Proxy Server"}],
        lifespan=lifespan,
    )

    # Wire container (DI)
    container.wire(modules=[health, analytics, metrics])
    app.container = container  # type: ignore

    # REST Routers
    app.include_router(health.router, prefix=settings.API_V1_STR, tags=["System"])
    app.include_router(
        analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"]
    )
    app.include_router(
        metrics.router, prefix=f"{settings.API_V1_STR}/metrics", tags=["Metrics"]
    )

    # GraphQL Router (Strawberry)
    async def get_context() -> dict:
        return {"container": container}

    graphql_router = GraphQLRouter(schema, graphql_ide="apollo-sandbox", context_getter=get_context)  # type: ignore
    app.include_router(
        graphql_router, prefix="/graphql", tags=["GraphQL"]
    )

    @app.get("/")
    async def root():
        return {"message": "Analytics Manager Service is running"}

    return app


app = create_app()

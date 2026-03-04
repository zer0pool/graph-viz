from contextlib import asynccontextmanager
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from app.api.graphql.resolvers import schema
from app.api.v1.endpoints import analytics, health, metrics
from app.core.config import settings
from app.core.container import Container


class DynamicRootPathMiddleware:
    """
    Middleware that dynamically sets the ASGI 'root_path' based on the 
    'X-Forwarded-Prefix' header provided by a reverse proxy (like Nginx).
    
    This allows the application to serve Swagger UI and correct OpenAPI URLs
    both when accessed directly (e.g., localhost:5004/docs) and when accessed 
    through a proxy with a subpath (e.g., /admin-console/analytics-manager/docs).
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            if b"x-forwarded-prefix" in headers:
                scope["root_path"] = headers[b"x-forwarded-prefix"].decode()
        return await self.app(scope, receive, send)


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
        lifespan=lifespan,
    )

    app.add_middleware(DynamicRootPathMiddleware)

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

from fastapi import FastAPI, Request
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from app.api.graphql.router import graphql_router
from app.api.v1.endpoints import health
from app.controller.router import analytics, metrics
from app.core.config import settings
from app.core.lifespan import lifespan
from app.infrastructure.middleware.access_log import AccessLogMiddleware


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
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        docs_url=None,    # Disabled — replaced by session-protected custom route
        redoc_url=None,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(DynamicRootPathMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        session_cookie="lineage_manager_session",  # shared with lineage_manager_v2
    )

    app.include_router(health.router, prefix=settings.API_V1_STR, tags=["System"])
    app.include_router(
        analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"]
    )
    app.include_router(
        metrics.router, prefix=f"{settings.API_V1_STR}/metrics", tags=["Metrics"]
    )
    app.include_router(graphql_router, prefix="/graphql", tags=["GraphQL"])

    @app.get("/docs", include_in_schema=False)
    async def swagger_ui(request: Request):
        user = request.session.get("user")
        if not user:
            return RedirectResponse(url=f"{settings.API_V1_STR}/auth/login")
        root = request.scope.get("root_path", "")
        return get_swagger_ui_html(
            openapi_url=f"{root}{settings.API_V1_STR}/openapi.json",
            title=f"{settings.PROJECT_NAME} - Swagger UI",
        )

    @app.get("/")
    async def root():
        return {"message": "Analytics Manager Service is running"}

    return app


app = create_app()

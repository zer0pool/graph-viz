from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.container import Container


class DynamicRootPathMiddleware:
    """
    Middleware that dynamically sets the ASGI 'root_path' based on the 
    'X-Forwarded-Prefix' header provided by a reverse proxy (like Nginx).
    
    This allows the application to serve Swagger UI and correct OpenAPI URLs
    both when accessed directly (e.g., localhost:5003/docs) and when accessed 
    through a proxy with a subpath (e.g., /admin-console/lineage-manager/docs).
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            
            # 1. Handle X-Forwarded-Prefix from proxies (e.g. Nginx)
            if b"x-forwarded-prefix" in headers:
                scope["root_path"] = headers[b"x-forwarded-prefix"].decode()
            
            # 2. Handle direct prefixed requests (e.g. GKE health checks / Cloud Load Balancer)
            elif scope["path"].startswith("/lineage-manager"):
                scope["path"] = scope["path"][len("/lineage-manager"):]
                scope["root_path"] = "/lineage-manager"
                
        return await self.app(scope, receive, send)


def create_app() -> FastAPI:
    container = Container()
    api_prefix = settings.API_V1_STR

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{api_prefix}/openapi.json",
    )

    app.add_middleware(DynamicRootPathMiddleware)

    # Middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Session Middleware for OIDC
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        session_cookie="lineage_manager_session",
    )

    # Include V1 Routers
    from app.api.internal.v1.endpoints import stats as internal_stats
    from app.api.v1.endpoints import (
        analytics,
        audits,
        auth,
        commands,
        graph,
        health,
        jobs,
        lineage,
        projects,
        resources,
        search,
        users,
    )

    app.include_router(health.router, prefix=api_prefix, tags=["System"])
    app.include_router(auth.router, prefix=f"{api_prefix}/auth", tags=["Auth"])
    
    # Domain specific routes
    app.include_router(projects.router, prefix=f"{api_prefix}/projects", tags=["Resources"])
    app.include_router(users.router, prefix=f"{api_prefix}/users", tags=["Resources"])
    app.include_router(jobs.router, prefix=f"{api_prefix}/jobs", tags=["Resources"])
    app.include_router(resources.router, prefix=f"{api_prefix}/resources", tags=["Resources"])
    
    # Combined Lineage & Tables router (Compatibility layer)
    # Registered without additional prefix because prefixes are handled inside the router
    app.include_router(lineage.router, prefix=api_prefix, tags=["Lineage"])
    
    app.include_router(audits.router, prefix=f"{api_prefix}/audits", tags=["System"])
    app.include_router(graph.router, prefix=f"{api_prefix}/graph", tags=["Graph"])
    app.include_router(commands.router, prefix=f"{api_prefix}/commands", tags=["System"])
    app.include_router(analytics.router, prefix=f"{api_prefix}/analytics", tags=["System"])
    app.include_router(search.router, prefix=f"{api_prefix}/search", tags=["Search"])
    app.include_router(internal_stats.router, prefix=f"{api_prefix}/internal", tags=["Internal"])

    # Mount Static Files for Legacy Console
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    @app.get("/")
    async def root():
        return {"message": "Lineage Manager V2 API is running"}

    app.container = container
    return app


app = create_app()

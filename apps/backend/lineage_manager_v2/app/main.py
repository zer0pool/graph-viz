from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.container import Container


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

    # Middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include V1 Routers
    from app.api.v1.endpoints import (
        health,
        jobs,
        projects,
        users,
        resources,
        lineage,
        audits,
        graph,
        commands,
        auth,
    )

    app.include_router(health.router, prefix=api_prefix, tags=["System"])
    app.include_router(auth.router, prefix=api_prefix, tags=["Auth"])
    app.include_router(
        projects.router, prefix=f"{api_prefix}/projects", tags=["Resources"]
    )
    app.include_router(
        users.router, prefix=f"{api_prefix}/users", tags=["Resources"]
    )
    app.include_router(
        jobs.router, prefix=f"{api_prefix}/jobs", tags=["Resources"]
    )
    app.include_router(
        resources.router, prefix=f"{api_prefix}/resources", tags=["Resources"]
    )
    app.include_router(
        lineage.router, prefix=f"{api_prefix}/lineage", tags=["Graph"]
    )
    app.include_router(
        audits.router, prefix=f"{api_prefix}/audits", tags=["System"]
    )
    app.include_router(
        graph.router, prefix=f"{api_prefix}/graph", tags=["Graph"]
    )
    app.include_router(
        commands.router, prefix=f"{api_prefix}/commands", tags=["System"]
    )

    # Mount Static Files for Legacy Console
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    @app.get("/")
    async def root():
        return {"message": "Lineage Manager V2 API is running"}

    app.container = container
    return app


app = create_app()

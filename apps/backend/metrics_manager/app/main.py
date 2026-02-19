from fastapi import FastAPI

from app.api.v1.endpoints import analytics, health
from app.core.config import settings
from app.core.container import Container


def create_app() -> FastAPI:
    container = Container()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
    )

    # Wire container (explicitly wire health and analytics modules)
    container.wire(modules=[health, analytics])

    app.container = container

    # Routers
    app.include_router(health.router, prefix=settings.API_V1_STR, tags=["System"])
    app.include_router(
        analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"]
    )

    @app.get("/")
    async def root():
        return {"message": "Metrics Manager Service is running"}

    return app


app = create_app()

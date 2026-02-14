
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v2.endpoints import health

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V2_STR}/openapi.json"
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

    # Include V2 Router
    app.include_router(health.router, prefix=settings.API_V2_STR, tags=["System"])

    @app.get("/")
    async def root():
        return {"message": "Lineage Manager V2 API is running"}

    return app

app = create_app()

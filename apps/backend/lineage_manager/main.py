import logging
import os
import sys

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from lineage_manager.api.v1.endpoints import auth as auth_ep
from lineage_manager.api.v1.endpoints import web as web_ep
from lineage_manager.api.v1.endpoints import audit as audit_ep
from lineage_manager.api.v1.endpoints import events as events_ep
from lineage_manager.api.v1.endpoints import expand as expand_ep
from lineage_manager.api.v1.endpoints import graph, jobs
from lineage_manager.api.v1.endpoints import lineage as lineage_ep
from lineage_manager.api.v1.endpoints import projects as projects_ep  # New
from lineage_manager.api.v1.endpoints import search as search_ep
from lineage_manager.api.v1.endpoints import sync as sync_ep
from lineage_manager.api.v1.endpoints import tables as tables_ep
from lineage_manager.api.v1.endpoints import users as users_ep
from lineage_manager.api.v1.endpoints import analytics as analytics_ep
from lineage_manager.core.config import get_settings
from lineage_manager.core.container import GraphContainer
from lineage_manager.core.database import Database
from lineage_manager.core.logging import setup_logging
from lineage_manager.core.middleware import session_middleware


# Custom middleware to reduce health check logging
async def health_check_middleware(request: Request, call_next):
    # Skip logging for health check endpoints
    if request.url.path in ["/", "/health", "/api/v1/graph/health"]:
        # Temporarily reduce logging level for this request
        logging.getLogger().setLevel(logging.WARNING)
        try:
            response = await call_next(request)
            return response
        finally:
            # Restore original logging level
            logging.getLogger().setLevel(logging.INFO)
    else:
        return await call_next(request)


class GraphApp(FastAPI):
    pass


def create_app() -> GraphApp:
    """
    Create and configure the FastAPI application with database initialization.
    """
    # Get settings
    settings = get_settings()

    # Setup logging with concise format
    setup_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    # Initialize dependency injection container
    # Note: Each container uses get_settings() directly for configuration
    app_container = GraphContainer()

    # Create FastAPI app with Swagger configuration
    app = FastAPI(
        title="Lineage Manager API",
        description="API for managing job dependency graphs and visualizing data pipelines",
        version="1.0.0",
        debug=settings.debug,
        root_path="/lineage-manager",
        docs_url="/docs" if settings.feature_flags.enable_swagger else None,
        redoc_url="/redoc" if settings.feature_flags.enable_swagger else None,
        openapi_url="/openapi.json" if settings.feature_flags.enable_swagger else None,
    )

    # ✅ Enable CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Allow all origins for easier debugging in local networks
        allow_credentials=settings.cors.allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add health check logging filter middleware
    app.middleware("http")(health_check_middleware)

    # Add container-based session management middleware
    app.middleware("http")(
        lambda request, call_next: session_middleware(request, call_next, app_container)
    )

    # Attach container to app and wire it
    app.container = app_container
    app_container.wire(
        modules=[
            graph,
            jobs,
            tables_ep,
            lineage_ep,
            search_ep,
            expand_ep,
            sync_ep,
            events_ep,
            auth_ep,
            web_ep,
            users_ep,
            projects_ep,  # New
            analytics_ep,
        ]
    )

    # Run Alembic migrations before database initialization
    # try:
    #     logger.info("Running Alembic migrations...")
    #     from alembic.config import Config
    #     from alembic import command
    #     import os
    #     
    #     # Get alembic.ini path
    #     alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    #     command.upgrade(alembic_cfg, "head")
    #     logger.info("Alembic migrations completed successfully")
    # except Exception as e:
    #     logger.warning(f"Alembic migration failed (may be already up to date): {e}")

    # Initialize database
    try:
        logger.info("Initializing database connection...")
        db_instance = app_container.core.database()

        # Test database connection
        if not db_instance.test_connection():
            logger.error("Database connection test failed. Exiting.")
            sys.exit(1)

        # Create database tables
        db_instance.create_database()
        logger.info("Database initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize database. Exiting. Error: {e}")
        sys.exit(1)

    # ----------------------------------------
    # 1️⃣ Static file serving configuration
    # ----------------------------------------
    # Calculate absolute path of static folder based on current file
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_DIR = os.path.join(BASE_DIR, "static")

    # ✅ Serve static files
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    # ----------------------------------------
    # 2️⃣ Register API routers
    # ----------------------------------------
    app.include_router(graph.router)
    app.include_router(jobs.router)
    app.include_router(tables_ep.router)
    app.include_router(lineage_ep.router)
    app.include_router(search_ep.router)
    app.include_router(expand_ep.router)
    app.include_router(sync_ep.router)
    app.include_router(events_ep.router)
    app.include_router(users_ep.router)
    app.include_router(projects_ep.router)  # New
    app.include_router(auth_ep.router)
    app.include_router(web_ep.router)
    app.include_router(audit_ep.router)
    app.include_router(analytics_ep.router)

    return app


app = create_app()

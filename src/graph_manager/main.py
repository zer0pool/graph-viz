import logging
import os
import sys

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from graph_manager.api.v1.endpoints import graph, jobs
from graph_manager.api.v1.endpoints import search as search_ep
from graph_manager.api.v1.endpoints import expand as expand_ep
from graph_manager.api.v1.endpoints import sync as sync_ep
from graph_manager.api.v1.endpoints import tables as tables_ep
from graph_manager.core.config import get_settings
from graph_manager.core.container import GraphContainer
from graph_manager.core.database import Database
from graph_manager.core.logging import setup_logging
from graph_manager.core.middleware import session_middleware


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
    app_container = GraphContainer()
    app_container.config.from_dict(settings.model_dump())

    # Create FastAPI app with Swagger configuration
    app = FastAPI(
        title="Graph Manager API",
        description="API for managing job dependency graphs and visualizing data pipelines",
        version="1.0.0",
        debug=settings.debug,
        docs_url="/docs" if settings.enable_swagger else None,
        redoc_url="/redoc" if settings.enable_swagger else None,
        openapi_url="/openapi.json" if settings.enable_swagger else None,
        contact={
            "name": "Graph Manager Team",
            "email": "support@graphmanager.com",
        },
        license_info={
            "name": "MIT License",
            "url": "https://opensource.org/licenses/MIT",
        },
    )

    # Add container-based session management middleware
    app.middleware("http")(
        lambda request, call_next: session_middleware(request, call_next, app_container)
    )

    # Attach container to app and wire it
    app.container = app_container
    app_container.wire(modules=[graph, jobs, tables_ep, search_ep, expand_ep, sync_ep])

    # Initialize database
    try:
        logger.info("Initializing database connection...")
        db_instance = Database()

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
    # 1️⃣ 정적 파일 서빙 설정
    # ----------------------------------------
    # 현재 파일 기준으로 static 폴더 절대경로 계산
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_DIR = os.path.join(BASE_DIR, "static")

    # ✅ Serve static files
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    # ----------------------------------------
    # 2️⃣ API 라우터 등록
    # ----------------------------------------
    app.include_router(graph.router)
    app.include_router(jobs.router)
    app.include_router(search_ep.router)
    app.include_router(expand_ep.router)
    app.include_router(sync_ep.router)
    app.include_router(tables_ep.router)

    # ----------------------------------------
    # 3️⃣ 기본 페이지(index.html) 반환
    # ----------------------------------------
    @app.get("/")
    def root():
        """프론트엔드 HTML 페이지 반환"""
        index_path = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index_path)

    # ----------------------------------------
    # 4️⃣ favicon 처리
    # ----------------------------------------
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = os.path.join(STATIC_DIR, "images", "favicon.ico")
        return FileResponse(favicon_path)

    return app


app = create_app()

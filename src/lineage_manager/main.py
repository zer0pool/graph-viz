import logging
import os
import sys

from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from lineage_manager.api.v1.endpoints import auth as auth_ep
from lineage_manager.api.v1.endpoints import diagnostics as diag_ep
from lineage_manager.api.v1.endpoints import events as events_ep
from lineage_manager.api.v1.endpoints import expand as expand_ep
from lineage_manager.api.v1.endpoints import graph, jobs
from lineage_manager.api.v1.endpoints import search as search_ep
from lineage_manager.api.v1.endpoints import sync as sync_ep
from lineage_manager.api.v1.endpoints import tables as tables_ep
from lineage_manager.api.v1.endpoints import users as users_ep
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
    app_container = GraphContainer()
    app_container.config.from_dict(settings.model_dump())

    # Create FastAPI app with Swagger configuration
    app = FastAPI(
        title="Lineage Manager API",
        description="API for managing job dependency graphs and visualizing data pipelines",
        version="1.0.0",
        debug=settings.debug,
        root_path="/lineage-manager",
        docs_url="/docs" if settings.enable_swagger else None,
        redoc_url="/redoc" if settings.enable_swagger else None,
        openapi_url="/openapi.json" if settings.enable_swagger else None,
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
            search_ep,
            expand_ep,
            sync_ep,
            events_ep,
            diag_ep,
            auth_ep,
            users_ep,
        ]
    )

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
    app.include_router(auth_ep.router)
    app.include_router(graph.router)
    app.include_router(jobs.router)
    app.include_router(search_ep.router)
    app.include_router(expand_ep.router)
    app.include_router(sync_ep.router)
    app.include_router(events_ep.router)
    app.include_router(diag_ep.router)
    app.include_router(tables_ep.router)
    app.include_router(users_ep.router)

    # ----------------------------------------
    # 3️⃣ Return default page (index.html)
    # ----------------------------------------
    @app.get("/")
    def root():
        """Return frontend HTML page"""
        index_path = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index_path)

    # ----------------------------------------
    # 4️⃣ Handle favicon
    # ----------------------------------------
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = os.path.join(STATIC_DIR, "images", "favicon.ico")
        return FileResponse(favicon_path)

    # ----------------------------------------
    # 5️⃣ Handle SSO redirect URI
    # ----------------------------------------
    @app.get("/authorized")
    def handle_sso_redirect_get():
        """Handle SSO redirect URI (GET) - frontend will process the authorization code"""
        index_path = os.path.join(STATIC_DIR, "index.html")
        return FileResponse(index_path)

    @app.post("/authorized")
    async def handle_sso_redirect_post(request: Request):
        """Handle SSO redirect URI (POST) - frontend will process the authorization code"""
        # Extract form data
        form_data = await request.form()
        code = form_data.get("code")
        id_token = form_data.get("id_token")
        state = form_data.get("state")
        error = form_data.get("error")
        error_description = form_data.get("error_description")

        # Handle errors
        if error:
            logging.error("SSO Error: %s - %s", error, error_description)
            # Return error page or redirect to error page
            # For now, we'll still return the index page but the frontend will handle the error
            pass

        # Read the index.html file and inject the form data as a JavaScript object
        index_path = os.path.join(STATIC_DIR, "index.html")
        with open(index_path, "r") as f:
            content = f.read()

        # Create JavaScript object with form data
        form_data_js = {}
        if code:
            form_data_js["code"] = code
        if id_token:
            form_data_js["id_token"] = id_token
        if state:
            form_data_js["state"] = state
        if error:
            form_data_js["error"] = error
        if error_description:
            form_data_js["error_description"] = error_description

        # Convert to JSON string
        form_data_json = json.dumps(form_data_js)

        # Inject the form data into the HTML
        script_tag = f"""
            <script>
                // Inject form data from POST redirect
                window.formData = new FormData();
                const formDataObj = {form_data_json};
                for (const [key, value] of Object.entries(formDataObj)) {{
                    window.formData.append(key, value);
                }}
                console.debug('[Index] Injected form data from POST redirect:', formDataObj);
            </script>
        """

        # Insert the script tag after the existing comment
        content = content.replace(
            "<!-- Handle form data from POST redirect -->",
            "<!-- Handle form data from POST redirect -->" + script_tag,
        )

        # Return the modified HTML content
        from fastapi.responses import HTMLResponse

        return HTMLResponse(content=content)

    return app


app = create_app()

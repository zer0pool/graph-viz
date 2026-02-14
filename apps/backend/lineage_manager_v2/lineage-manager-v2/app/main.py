from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json"
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

    # Mount Static Files (Standalone UI)
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

    # Import and include routers
    from app.api.v1 import health, graph
    app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
    app.include_router(graph.router, prefix=settings.API_V1_STR, tags=["Graph"])

    # GraphQL
    from strawberry.fastapi import GraphQLRouter
    from app.graphql.schema import schema
    from app.graphql.context import get_context
    
    graphql_app = GraphQLRouter(schema, context_getter=get_context)
    app.include_router(graphql_app, prefix="/graphql", tags=["GraphQL"])

    @app.get("/")
    async def root():
        return {"message": "Lineage Manager V2 API"}

    return app

app = create_app()

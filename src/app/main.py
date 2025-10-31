from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from src.app.api.graph_api import router as graph_router

# Create FastAPI app
app = FastAPI(
    title="Graph Visualization API",
    description="""
    A Graph Visualization Service API that provides DAG (Directed Acyclic Graph) visualization 
    capabilities for job dependencies.
    
    ## Features
    * Get upstream dependencies for a job
    * Get downstream dependencies for a job
    * Synchronize job data with external systems
    
    ## Documentation
    Visit `/redoc` for ReDoc documentation or `/docs` for Swagger UI.
    """,
    version="1.0.0",
    openapi_tags=[{
        "name": "graph",
        "description": "Operations with job dependency graphs. Includes upstream/downstream traversal and sync.",
    }],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
) 
 
# ✅ static을 명시적으로 mount
app.mount("/static", StaticFiles(directory="src/app/static"), name="static")

# ✅ 루트(/) 요청은 index.html 반환
@app.get("/")
async def root():
    return FileResponse("src/app/static/index.html")


app.include_router(graph_router, prefix="/api", tags=["graph"])

@app.get("/", include_in_schema=False)
async def index():
    return FileResponse("static/index.html")

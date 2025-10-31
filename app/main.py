from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.graph_api import router as graph_router

app = FastAPI(title="Graph Service (FastAPI + Cytoscape)") 
 
# ✅ static을 명시적으로 mount
app.mount("/static", StaticFiles(directory="static"), name="static")

# ✅ 루트(/) 요청은 index.html 반환
@app.get("/")
async def root():
    return FileResponse("static/index.html")


app.include_router(graph_router, prefix="/api", tags=["graph"])

@app.get("/", include_in_schema=False)
async def index():
    return FileResponse("static/index.html")

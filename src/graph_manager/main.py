from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from graph_manager.api.v1.endpoints import graph, jobs
import os

app = FastAPI(title="Graph Manager API")

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
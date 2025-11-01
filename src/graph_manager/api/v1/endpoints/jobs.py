# app/api/v1/jobs.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import random


from graph_manager.core.subgraph_extractor import extract_subgraph

# 그래프 데이터 (임시 저장소)
from graph_manager.api.v1.endpoints.graph import GRAPH_CACHE

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


# ==========================================================
# 📘 1️⃣ Job 목록 조회
# ==========================================================
@router.get("/")
async def list_jobs(limit: int = Query(30, ge=1, le=100)):
    """
    Job 목록 조회
    - 전체 그래프에서 Job 노드만 반환
    """
    jobs = [n for n in GRAPH_CACHE["nodes"] if n["type"] == "job"]
    return {
        "total": len(jobs),
        "items": jobs[:limit]
    }


# ==========================================================
# 📘 2️⃣ Job 상세 조회
# ==========================================================
@router.get("/{job_id}")
async def get_job_detail(job_id: str):
    """
    Job 상세 정보 조회
    - run_status, reference_tables, destination_table, trigger_tables 등
    """
    job = next((n for n in GRAPH_CACHE["nodes"]
                if n["id"] == job_id and n["type"] == "job"), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return {
        "job_id": job["id"],
        "label": job["label"],
        "run_status": job.get("run_status", "UNKNOWN"),
        "reference_tables": job.get("reference_tables", []),
        "destination_table": job.get("destination_table"),
        "trigger_tables": job.get("trigger_tables", []),
        "metrics": {
            "avg_duration": f"{round(60 + 60 * random.random(), 1)}s",
            "last_run": "2025-10-31T23:45:00",
            "fail_rate": f"{round(random.random() * 5, 2)}%"
        }
    }


# ==========================================================
# 📘 3️⃣ Job 서브그래프 조회
# ==========================================================
@router.get("/{job_id}/graph")
async def get_job_graph(job_id: str, depth: int = 1):
    """
    특정 Job을 중심으로 하는 서브그래프 조회
    - depth: 확장 깊이 (기본 1단계)
    """
    subgraph = extract_subgraph(GRAPH_CACHE, job_id, depth)
    return {
        "job_id": job_id,
        "depth": depth,
        "node_count": len(subgraph["nodes"]),
        "edge_count": len(subgraph["edges"]),
        "graph": subgraph
    }


# ==========================================================
# 📘 4️⃣ Job 상태 / 속성 변경 (PATCH)
# ==========================================================
class JobUpdateRequest(BaseModel):
    run_status: Optional[str] = None
    trigger_tables: Optional[List[str]] = None

@router.patch("/{job_id}")
async def update_job(job_id: str, payload: JobUpdateRequest):
    """
    Job 상태(run_status) 또는 속성(trigger_tables) 변경
    """
    job = next((n for n in GRAPH_CACHE["nodes"]
                if n["id"] == job_id and n["type"] == "job"), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    updates = {}

    # 실행 상태 변경
    if payload.run_status:
        if payload.run_status not in ["RUNNING", "STOPPED"]:
            raise HTTPException(status_code=400, detail="Invalid run_status")
        job["run_status"] = payload.run_status
        updates["run_status"] = payload.run_status

    # 트리거 테이블 수정
    if payload.trigger_tables is not None:
        job["trigger_tables"] = payload.trigger_tables
        updates["trigger_tables"] = payload.trigger_tables

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    return {
        "job_id": job_id,
        "updated": updates,
        "message": f"Job '{job_id}' updated successfully."
    }


# ==========================================================
# 📘 5️⃣ Job 실행 토글 (optional helper)
# ==========================================================
@router.post("/{job_id}/actions/toggle")
async def toggle_job_status(job_id: str):
    """
    Job 실행 상태를 RUNNING <-> STOPPED로 토글 (보조 API)
    """
    job = next((n for n in GRAPH_CACHE["nodes"]
                if n["id"] == job_id and n["type"] == "job"), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    current = job.get("run_status", "STOPPED")
    new_status = "STOPPED" if current == "RUNNING" else "RUNNING"
    job["run_status"] = new_status

    return {
        "job_id": job_id,
        "previous_status": current,
        "new_status": new_status,
        "message": f"Job '{job_id}' is now {new_status.lower()}."
    }

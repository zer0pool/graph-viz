# app/api/v1/jobs.py
import random
from typing import List, Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_service import GraphService

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


# ==========================================================
# 📘 2️⃣ Job 상세 조회
# ==========================================================
@router.get("/{job_id}")
@inject
def get_job_detail(
    job_id: str,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    Job 상세 정보 조회
    - 데이터베이스에서 Job 상세 정보 조회
    """
    job = graph_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return {
        "job_id": job.job_id,
        "name": job.name,
        "labels": job.labels,
        "status": job.status,
        "enabled": job.enabled,
        "owner": job.owner,
        "write_mode": job.write_mode,
        "destination_type": job.destination_type,
        "destination_table": job.destination_table,
        "trigger_tables": job.trigger_tables,
        "reference_tables": job.reference_tables,
        "metadata": job.job_metadata,
    }


# ==========================================================
# 📘 3️⃣ Job 서브그래프 조회
# ==========================================================
@router.get("/{job_id}/graph")
@inject
def get_job_graph(
    job_id: str,
    depth: int = 1,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    특정 Job을 중심으로 하는 서브그래프 조회
    - 데이터베이스에서 Job 의존 관계 조회
    """
    dependencies = graph_service.get_job_dependencies(job_id, max_depth=depth)

    if dependencies["status"] == "error":
        raise HTTPException(status_code=500, detail=dependencies["message"])

    return {
        "job_id": job_id,
        "dependencies": dependencies,
        "depth": depth,
    }


# ==========================================================
# 📘 4️⃣ Job 상태 / 속성 변경 (PATCH)
# ==========================================================
class JobUpdateRequest(BaseModel):
    status: Optional[str] = None
    enabled: Optional[bool] = None
    trigger_tables: Optional[List[str]] = None


@router.patch("/{job_id}")
@inject
def update_job(
    job_id: str,
    payload: JobUpdateRequest,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    Job 상태(status) 또는 속성(trigger_tables) 변경
    """
    job = graph_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    updates = {}

    # 상태 변경
    if payload.status is not None:
        if payload.status not in ["pending", "success", "failure", "disabled"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        job.status = payload.status
        updates["status"] = payload.status

    # 활성화 상태 변경
    if payload.enabled is not None:
        job.enabled = payload.enabled
        updates["enabled"] = payload.enabled

    # 트리거 테이블 수정
    if payload.trigger_tables is not None:
        job.trigger_tables = payload.trigger_tables
        updates["trigger_tables"] = payload.trigger_tables

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    return {
        "job_id": job_id,
        "updated": updates,
        "message": f"Job '{job_id}' updated successfully.",
    }


# ==========================================================
# 📘 5️⃣ Job 실행 토글 (optional helper)
# ==========================================================
@router.post("/{job_id}/actions/toggle")
@inject
def toggle_job_status(
    job_id: str,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    Job 활성화 상태를 토글 (보조 API)
    """
    job = graph_service.toggle_job_enabled(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    return {
        "job_id": job_id,
        "enabled": job.enabled,
        "status": job.status,
        "message": f"Job '{job_id}' is now {'enabled' if job.enabled else 'disabled'}.",
    }

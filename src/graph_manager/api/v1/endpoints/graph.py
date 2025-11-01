from fastapi import APIRouter, HTTPException
from graph_manager.core.graph_builder import generate_sample_graph
from graph_manager.services.graph_service import GraphService
from graph_manager.repositories.graph_repository import GraphRepository
from graph_manager.core.subgraph_extractor import extract_subgraph

router = APIRouter(prefix="/api", tags=["graph"])

repo = GraphRepository()
service = GraphService(repo)


# 임시 저장 (DB 없이 메모리용)
GRAPH_CACHE = generate_sample_graph("medium")


@router.get("/graph")
def get_graph(size: str = "small"):
    """그래프 전체 조회"""
    graph = service.get_graph(size)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    return graph



@router.get("/jobs/{job_id}")
async def get_job_subgraph(job_id: str, depth: int = 1):
    """
    특정 Job 중심 서브그래프 조회
    """
    subgraph = extract_subgraph(GRAPH_CACHE, job_id, depth)
    return {
        "job_id": job_id,
        "depth": depth,
        "node_count": len(subgraph["nodes"]),
        "edge_count": len(subgraph["edges"]),
        "graph": subgraph
    }


@router.post("/job/{job_id}/toggle")
def toggle_job_enabled(job_id: str):
    """활성화/비활성화 토글"""
    job = service.toggle_job_enabled(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"job_id": job.id, "enabled": job.enabled, "status": job.status}


@router.post("/job/{job_id}/trigger")
def toggle_trigger(job_id: str):
    """트리거 설정 변경 (시뮬레이션용)"""
    job = service.toggle_trigger(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"job_id": job.id, "trigger_enabled": job.trigger_enabled}


@router.post("/rebuild")
async def rebuild_graph(size: str = "medium"):
    """
    그래프 전체 재구성 (샘플 job 데이터로 DAG 생성)
    """
    graph = generate_sample_graph(size=size)
    return {
        "status": "success",
        "node_count": len(graph["nodes"]),
        "edge_count": len(graph["edges"]),
        "graph": graph
    }



# ---------------------------------------------------------
# 3️⃣ Job 상세 정보 조회 API
# ---------------------------------------------------------
@router.get("/jobs/{job_id}/detail")
async def get_job_detail(job_id: str):
    """
    Job 상세 정보 조회
    - run_status, reference_tables, destination_table, trigger_tables 포함
    """
    # Job 노드 찾기
    job_node = next((n for n in GRAPH_CACHE["nodes"]
                     if n["id"] == job_id and n["type"] == "job"), None)

    if not job_node:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    # 응답 구성
    return {
        "job_id": job_node["id"],
        "label": job_node["label"],
        "run_status": job_node.get("run_status", "UNKNOWN"),
        "reference_tables": job_node.get("reference_tables", []),
        "destination_table": job_node.get("destination_table"),
        "trigger_tables": job_node.get("trigger_tables", []),
        "metrics": {
            "avg_duration": f"{round(60 + 60 * random.random(), 1)}s",
            "last_run": "2025-10-31T23:45:00",
            "fail_rate": f"{round(random.random() * 5, 2)}%"
        }
    }    
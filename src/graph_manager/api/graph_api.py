# from fastapi import APIRouter
# from pydantic import BaseModel
# from typing import List, Dict, Any

# router = APIRouter()

# GRAPH_STATE: Dict[str, Any] = {
#     "nodes": [
#         {"id": "job_1", "label": "Extract Raw Data", "status": "success"},
#         {"id": "job_2", "label": "Clean Data (job_2)", "status": "success"},
#         {"id": "job_3", "label": "Transform Raw → Features (job_3)", "status": "success"},
#         {"id": "job_4", "label": "Merge Cleaned + Features (job_4)", "status": "pending"},
#         {"id": "job_5", "label": "Analyze Trends (job_5)", "status": "pending"},
#         {"id": "job_6", "label": "Prepare Metrics (job_6)", "status": "pending"},
#         {"id": "job_7", "label": "Generate Reports (job_7)", "status": "pending"},
#         {"id": "job_8", "label": "Export Metrics (job_8)", "status": "pending"},
#         {"id": "job_9", "label": "Notify Stakeholders (job_9)", "status": "pending"},
#         {"id": "job_10", "label": "Publish Dashboard (job_10)", "status": "pending"},
#     ],
#     "edges": [
#         # Root flow
#         {"id": "job_1_job_2", "source": "job_1", "target": "job_2", "label": "raw → clean"},
#         {"id": "job_1_job_3", "source": "job_1", "target": "job_3", "label": "raw → features"},

#         # Merge stage
#         {"id": "job_2_job_4", "source": "job_2", "target": "job_4", "label": "clean → merge"},
#         {"id": "job_3_job_4", "source": "job_3", "target": "job_4", "label": "features → merge"},

#         # Branching paths
#         {"id": "job_4_job_5", "source": "job_4", "target": "job_5", "label": "merge → analyze"},
#         {"id": "job_4_job_6", "source": "job_4", "target": "job_6", "label": "merge → metrics"},

#         # Deep branches
#         {"id": "job_5_job_7", "source": "job_5", "target": "job_7", "label": "analyze → report"},
#         {"id": "job_6_job_8", "source": "job_6", "target": "job_8", "label": "metrics → export"},
#         {"id": "job_6_job_9", "source": "job_6", "target": "job_9", "label": "metrics → notify"},

#         # Final aggregation
#         {"id": "job_7_job_10", "source": "job_7", "target": "job_10", "label": "report → dashboard"},
#         {"id": "job_8_job_10", "source": "job_8", "target": "job_10", "label": "export → dashboard"},
#         {"id": "job_9_job_10", "source": "job_9", "target": "job_10", "label": "notify → dashboard"},
#     ],
#     "meta": {"root": "job_1"},
# }

# class CytoscapeGraph(BaseModel):
#     nodes: List[Dict[str, Any]]
#     edges: List[Dict[str, Any]]
#     meta: Dict[str, Any] | None = None

# @router.get("/graph", response_model=CytoscapeGraph)
# async def get_graph():
#     return GRAPH_STATE

# @router.post("/graph")
# async def update_graph(payload: CytoscapeGraph):
#     GRAPH_STATE.update(payload.dict())
#     return {"ok": True, "count": {"nodes": len(payload.nodes), "edges": len(payload.edges)}}

# @router.post("/graph/reset")
# async def reset_graph():
#     GRAPH_STATE.update({"nodes": [], "edges": [], "meta": {}})
#     return {"ok": True}

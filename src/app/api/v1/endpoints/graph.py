from fastapi import APIRouter, Depends, HTTPException
from dependency_injector.wiring import inject, Provider
from src.app.services.graph_service import GraphService
from src.app.core.di import Container
from src.app.models.graph import Graph, GraphSync

router = APIRouter()

@router.get("/job/{job_id}/upstream", 
    response_model=Graph,
    summary="Get Upstream Graph",
    description="""
    Retrieves the upstream dependency graph for a specific job.
    
    The graph includes:
    * All predecessor nodes (jobs that must complete before this job)
    * Edges representing dependencies between jobs
    * Current status of each job in the graph
    """,
    responses={
        200: {
            "description": "Successful retrieval of upstream graph",
            "content": {
                "application/json": {
                    "example": {
                        "nodes": [
                            {"id": "1", "label": "Start Job", "status": "success"},
                            {"id": "2", "label": "Current Job", "status": "pending"}
                        ],
                        "edges": [
                            {"source": "1", "target": "2", "label": "depends_on"}
                        ]
                    }
                }
            }
        },
        404: {"description": "Job not found"}
    }
)
@inject
async def get_upstream_graph(
    job_id: int,
    graph_service: GraphService = Depends(Container.graph_service)
):
    """Get upstream DAG for a specific job"""
    graph = await graph_service.get_upstream_graph(job_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Job not found")
    return graph

@router.get("/job/{job_id}/downstream", 
    response_model=Graph,
    summary="Get Downstream Graph",
    description="""
    Retrieves the downstream dependency graph for a specific job.
    
    The graph includes:
    * All successor nodes (jobs that depend on this job)
    * Edges representing dependencies between jobs
    * Current status of each job in the graph
    """,
    responses={
        200: {
            "description": "Successful retrieval of downstream graph",
            "content": {
                "application/json": {
                    "example": {
                        "nodes": [
                            {"id": "1", "label": "Current Job", "status": "success"},
                            {"id": "2", "label": "Dependent Job", "status": "pending"}
                        ],
                        "edges": [
                            {"source": "1", "target": "2", "label": "triggers"}
                        ]
                    }
                }
            }
        },
        404: {"description": "Job not found"}
    }
)
@inject
async def get_downstream_graph(
    job_id: int,
    graph_service: GraphService = Depends(Container.graph_service)
):
    """Get downstream DAG for a specific job"""
    graph = await graph_service.get_downstream_graph(job_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Job not found")
    return graph

@router.post("/job/{job_id}/sync", 
    response_model=GraphSync,
    summary="Synchronize Job Data",
    description="""
    Synchronizes job data with external systems.
    
    This endpoint will:
    * Update job status from external sources
    * Refresh dependency information
    * Update metadata and timestamps
    """,
    responses={
        200: {
            "description": "Job data successfully synchronized",
            "content": {
                "application/json": {
                    "example": {
                        "job_id": 1,
                        "status": "success",
                        "message": "Job data synchronized successfully"
                    }
                }
            }
        },
        404: {"description": "Job not found"},
        500: {"description": "Synchronization failed"}
    }
)
@inject
async def sync_job_data(
    job_id: int,
    graph_service: GraphService = Depends(Container.graph_service)
):
    """Synchronize job data with external system"""
    return await graph_service.sync_job_data(job_id)
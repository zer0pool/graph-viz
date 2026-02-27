from fastapi import APIRouter, Depends, HTTPException, status
from dependency_injector.wiring import inject, Provide
from app.core.container import Container
from app.api.v1.schemas.graph import (
    GraphInitResponse,
    TaskStatusResponse,
    GraphStatsResponse,
)
from app.services.graph_service import GraphService
from app.tasks.graph_tasks import initialize_graph_task

router = APIRouter()


@router.post("/init", response_model=GraphInitResponse)
async def initialize_graph(drop_existing: bool = False):
    """
    Triggers a background rebuild of the lineage graph.
    Returns a task_id to track progress.
    """
    task = initialize_graph_task.delay(drop_existing)
    return GraphInitResponse(
        status="accepted",
        task_id=task.id,
        message="Graph initialization started in background",
    )


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Check the status of a background task.
    """
    from celery.result import AsyncResult
    from app.core.celery_app import celery_app

    res = AsyncResult(task_id, app=celery_app)
    return TaskStatusResponse(
        task_id=task_id, status=res.status, result=res.result if res.ready() else None
    )


@router.get("/diagnose", response_model=GraphStatsResponse)
@inject
async def diagnose(
    graph_service: GraphService = Depends(Provide[Container.graph_service]),
):
    """
    Returns statistics about the currently stored lineage graph.
    """
    return await graph_service.diagnose()

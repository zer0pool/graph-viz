"""API endpoints for project-related operations."""

import logging
from typing import Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Query

from lineage_manager.core.auth import require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.services.project_service import ProjectService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/projects",
    tags=["Projects"],
    dependencies=[Depends(require_authenticated_user)],
)


@router.get("")
@inject
def list_projects(
    limit: int = Query(100, ge=1, le=1000),
    svc: ProjectService = Depends(Provide[GraphContainer.graph.project_service]),
):
    """
    List all projects with job counts.
    
    Args:
        limit: Maximum number of projects to return
        
    Returns:
        List of projects with statistics
    """
    try:
        projects = svc.list_all_projects(limit=limit)
        return {"projects": projects, "total": len(projects)}
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/summary")
@inject
def get_project_summary(
    project_id: str,
    svc: ProjectService = Depends(Provide[GraphContainer.graph.project_service]),
):
    """
    Get project summary statistics.
    """
    try:
        return svc.get_project_summary(project_id)
    except Exception as e:
        logger.error(f"Failed to get project summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
@inject
def get_project_detail(
    project_id: str,
    svc: ProjectService = Depends(Provide[GraphContainer.graph.project_service]),
):
    """
    Get project detail with summary statistics.
    
    Args:
        project_id: Project identifier
        
    Returns:
        Project detail with job count
    """
    try:
        return svc.get_project_detail(project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get project detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/jobs")
@inject
def list_project_jobs(
    project_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    svc: ProjectService = Depends(Provide[GraphContainer.graph.project_service]),
):
    """
    List jobs in a project with pagination.
    
    Args:
        project_id: Project identifier
        limit: Maximum number of results (default: 20)
        offset: Offset for pagination (default: 0)
        
    Returns:
        Jobs list with pagination info
    """
    try:
        return svc.list_project_jobs(
            project_id=project_id,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Failed to list project jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/{project_id}/users")
@inject
def list_project_users(
    project_id: str,
    svc: ProjectService = Depends(Provide[GraphContainer.graph.project_service]),
):
    """
    List users associated with a project.
    """
    try:
        return svc.list_project_users(project_id)
    except Exception as e:
        logger.error(f"Failed to list project users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

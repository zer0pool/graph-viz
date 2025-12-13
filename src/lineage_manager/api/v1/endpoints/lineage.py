"""
Lineage lookup endpoints for tables and jobs.

Provides efficient upstream/downstream queries using the graph_closure table.
"""

import logging
from typing import Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Query

from lineage_manager.core.container import GraphContainer
from lineage_manager.core.uow import GraphUnitOfWork

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/lineage",
    tags=["Lineage"],
    # dependencies=AUTH_DEPS,  # Commented out for POC
)


@router.get("/tables/{table_name}/upstream")
@inject
async def get_table_upstream(
    table_name: str,
    max_depth: Optional[int] = Query(None, description="Maximum depth to traverse"),
    node_type: Optional[str] = Query(
        None, description="Filter by node type (table/job)"
    ),
    uow: GraphUnitOfWork = Depends(Provide[GraphContainer.graph.write_uow]),
):
    """
    Get all upstream dependencies for a table.

    Returns all tables and jobs that this table depends on, directly or indirectly.
    """
    try:
        # Get table node
        table = uow.tables.get_by_full_name(table_name)
        if not table:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

        # Query closure
        upstream = uow.closures.get_upstream_nodes(
            table.id, node_type=node_type, max_depth=max_depth
        )

        return {
            "table": table_name,
            "upstream_count": len(upstream),
            "upstream": upstream,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting upstream for table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables/{table_name}/downstream")
@inject
async def get_table_downstream(
    table_name: str,
    max_depth: Optional[int] = Query(None, description="Maximum depth to traverse"),
    node_type: Optional[str] = Query(
        None, description="Filter by node type (table/job)"
    ),
    uow: GraphUnitOfWork = Depends(Provide[GraphContainer.graph.write_uow]),
):
    """
    Get all downstream dependencies for a table.

    Returns all tables and jobs that depend on this table, directly or indirectly.
    """
    try:
        # Get table node
        table = uow.tables.get_by_full_name(table_name)
        if not table:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

        # Query closure
        downstream = uow.closures.get_downstream_nodes(
            table.id, node_type=node_type, max_depth=max_depth
        )

        return {
            "table": table_name,
            "downstream_count": len(downstream),
            "downstream": downstream,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting downstream for table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/upstream")
@inject
async def get_job_upstream(
    job_id: str,
    max_depth: Optional[int] = Query(None, description="Maximum depth to traverse"),
    uow: GraphUnitOfWork = Depends(Provide[GraphContainer.graph.write_uow]),
):
    """
    Get all upstream jobs.

    Returns all jobs that this job depends on, directly or indirectly.
    """
    try:
        # Get job node
        job = uow.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

        # Query closure for upstream jobs only
        upstream_jobs = uow.closures.get_upstream_nodes(
            job.id, node_type="job", max_depth=max_depth
        )

        return {
            "job_id": job_id,
            "upstream_count": len(upstream_jobs),
            "upstream_jobs": upstream_jobs,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting upstream for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/downstream")
@inject
async def get_job_downstream(
    job_id: str,
    max_depth: Optional[int] = Query(None, description="Maximum depth to traverse"),
    uow: GraphUnitOfWork = Depends(Provide[GraphContainer.graph.write_uow]),
):
    """
    Get all downstream jobs.

    Returns all jobs that depend on this job, directly or indirectly.
    """
    try:
        # Get job node
        job = uow.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

        # Query closure for downstream jobs only
        downstream_jobs = uow.closures.get_downstream_nodes(
            job.id, node_type="job", max_depth=max_depth
        )

        return {
            "job_id": job_id,
            "downstream_count": len(downstream_jobs),
            "downstream_jobs": downstream_jobs,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting downstream for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from lineage_manager.api.v1.schemas import JobRegister, BatchJobSyncRequest
from lineage_manager.core.auth import is_auth_enabled, require_authenticated_user
from lineage_manager.core.container import GraphContainer
from lineage_manager.models.scheduling_lineage import SchedulingLineage
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_sync_service import GraphSyncService
from lineage_manager.services.graph_initializer import GraphInitializerService

logger = logging.getLogger(__name__)

AUTH_DEPS = [Depends(require_authenticated_user)]

router = APIRouter(
    prefix="/api/v1/graph",
    tags=["graph"],
    dependencies=AUTH_DEPS,
)


@router.post("/jobs")
@inject
def register_job(
    payload: JobRegister,
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
):
    """
    Register a new job using container pattern with proper session management.

    - Container provides session-managed Unit of Work
    - GraphService uses container-provided UoW
    - Transaction is automatically committed by middleware
    """
    logger.info(f"Received job registration request: {payload}")
    try:
        job_id = svc.register_job(payload)
        logger.info(f"Job registered successfully: {job_id}")
        return {"job_id": job_id}
    except Exception as e:
        logger.error(f"Error registering job: {e}")
        logger.exception("Full traceback:")
        raise





@router.post("/reset")
@inject
def reset_graph(
    svc: GraphCommandService = Depends(Provide[GraphContainer.graph.command_service]),
):
    """
    Reset the entire graph by clearing all graph-related data.

    This endpoint will delete all data from:
    - graph_closure (transitive relationships)
    - graph_edge (direct dependencies)
    - graph_edge (job-table links)
    - graph_node (jobs and tables)

    ⚠️ **Warning**: This action is irreversible and will delete all graph data!
    """
    logger.info("Received graph reset request")
    try:
        with svc.uow.transactional():
            result = svc.reset_graph()
        logger.info("Graph reset completed successfully and committed")
        return result
    except Exception as e:
        logger.error(f"Graph reset failed: {e}")
        logger.exception("Full traceback:")

        raise HTTPException(status_code=500, detail=f"Graph reset failed: {str(e)}")


@router.post("/initialize")
@inject
async def initialize_graph(
    initializer: GraphInitializerService = Depends(Provide[GraphContainer.graph.initializer_service]),
):
    """
    Initialize the graph by fetching all jobs from Job Manager API
    and creating graph nodes, edges, and closure entries based on job dependencies.

    This endpoint will:
    1. Clear all existing graph data
    2. Fetch all jobs from the Job Manager API
    3. Register each job using the existing register_job method
    4. Create appropriate nodes, edges, and relationships
    5. Return statistics about the initialization process

    The process uses the existing register_job method to ensure consistency
    with single job registration functionality.
    """
    logger.info("Received graph initialization request")
    try:
        result = await initializer.initialize()
        logger.info(f"Graph initialization completed: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Graph initialization failed: {e}")
        logger.exception("Full traceback:")

        raise HTTPException(
            status_code=500, detail=f"Graph initialization failed: {str(e)}"
        )


@router.get("/health")
@inject
def health_check(
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """
    Get basic database statistics for health monitoring.

    Returns counts of:
    - Jobs (job nodes in graph_node table)
    - Tables (table nodes in graph_node table)
    - Edges (dependencies in graph_edge table)
    - Closure entries (transitive relationships in graph_closure table)
    - Database connection status
    """
    logger.info("Received health check request")
    try:
        result = svc.get_health_stats()
        logger.info(f"Health check completed: {result['status']}")
        return result
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        logger.exception("Full traceback:")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/table/{full_name}/dag")
@inject
def get_table(
    full_name: str,
    direction: str = Query("both", enum=["upstream", "downstream", "both"]),
    depth: int = Query(3, ge=1, le=10),
    include_jobs: bool = Query(True),
    include_tables: bool = Query(True),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    """
    Get DAG (Directed Acyclic Graph) information for a specific table.

    Returns detailed information about:
    - The table itself
    - Upstream jobs (jobs that produce this table as output)
    - Downstream jobs (jobs that consume this table as input)
    - Related tables (tables that are connected through the same jobs)
    """

    logger.info(f"Received table DAG request for: {full_name}")
    try:
        result = svc.get_table_dag(
            full_name=full_name,
            direction=direction,
            depth=depth,
            include_jobs=include_jobs,
            include_tables=include_tables,
        )
        logger.info(f"Table DAG completed for {full_name}:  ")
        return result
    except Exception as e:
        logger.error(f"Table DAG failed for {full_name}: {e}")
        logger.exception("Full traceback:")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Table DAG failed: {str(e)}")


# 01) Neighbors APIs
@router.get("/job/{job_id}/neighbors")
@inject
def get_job_neighbors(
    job_id: str,
    level: int = 1,
    direction: str = Query("both", enum=["upstream", "downstream", "both"]),
    limit: int | None = Query(None, ge=1, le=1000),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    try:
        return svc.get_job_neighbors(
            job_id=job_id, level=level, direction=direction, limit=limit
        )
    except Exception as e:
        logger.error(f"Neighbors query failed for job {job_id}: {e}")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Neighbors query failed: {str(e)}")


@router.get("/table/{table_name}/neighbors")
@inject
def get_table_neighbors(
    table_name: str,
    level: int = 1,
    direction: str = Query("both", enum=["upstream", "downstream", "both"]),
    limit: int | None = Query(None, ge=1, le=1000),
    svc: GraphQueryService = Depends(Provide[GraphContainer.graph.query_service]),
):
    try:
        return svc.get_table_neighbors(
            table_name=table_name, level=level, direction=direction, limit=limit
        )
    except Exception as e:
        logger.error(f"Neighbors query failed for table {table_name}: {e}")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Neighbors query failed: {str(e)}")

# ========================================================================
# NEW: Direct Lineage Sync APIs
# ========================================================================

@router.post("/jobs/sync")
@inject
def sync_job_lineage(
    lineage: SchedulingLineage,
    dry_run: bool = Query(False, description="Preview changes without committing"),
    svc: GraphSyncService = Depends(Provide[GraphContainer.graph.sync_service]),
):
    """
    Directly sync a job's lineage information to the graph.
    
    Query params:
    - dry_run: If true, return preview of changes without committing
    
    Use case: Copy lineage JSON from Job Manager Swagger → Paste here for testing
    """
    logger.info(f"Received direct sync request for job: {lineage.job_id}, dry_run={dry_run}")
    try:
        result = svc.sync_single_job(lineage, dry_run=dry_run)
        logger.info(f"Sync completed for {lineage.job_id}: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Failed to sync job {lineage.job_id}: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

 
@router.post("/jobs/sync/by_ids")
@inject
async def sync_jobs_by_ids(
    request: BatchJobSyncRequest,  # Import will be added
    dry_run: bool = Query(False, description="Preview changes without committing"),
    svc: GraphSyncService = Depends(Provide[GraphContainer.graph.sync_service]),
):
    """
    Sync multiple jobs by fetching their lineages from Job Manager.
    
    Query params:
    - dry_run: If true, return preview of changes without committing
    
    Use case: Batch sync multiple jobs efficiently
    """
    logger.info(f"Received batch sync request for {len(request.jobs)} jobs, dry_run={dry_run}")
    try:
        result = await svc.sync_multiple_jobs(
            job_requests=[job.dict() for job in request.jobs],
            dry_run=dry_run
        )
        logger.info(f"Batch sync completed: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Failed to sync jobs: {e}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

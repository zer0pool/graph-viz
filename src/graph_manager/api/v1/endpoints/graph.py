import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query, Request

from graph_manager.api.v1.schemas import JobRegister
from graph_manager.core.container import GraphContainer
from graph_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


@router.post("/jobs")
@inject
def register_job(
    payload: JobRegister,
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
):
    """
    Register a new job using container pattern with proper session management.

    - Container provides session-managed Unit of Work
    - GraphService uses container-provided UoW
    - Transaction is automatically committed by middleware
    """
    logger.info(f"Received job registration request: {payload}")
    try:
        job_id = graph_service.register_job(payload)
        logger.info(f"Job registered successfully: {job_id}")
        return {"job_id": job_id}
    except Exception as e:
        logger.error(f"Error registering job: {e}")
        logger.exception("Full traceback:")
        raise


@router.post("/reset")
@inject
def reset_graph(
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
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
        result = graph_service.reset_graph()
        logger.info("Graph reset completed successfully")
        return result
    except Exception as e:
        logger.error(f"Graph reset failed: {e}")
        logger.exception("Full traceback:")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Graph reset failed: {str(e)}")


@router.post("/initialize")
@inject
async def initialize_graph(
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
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
        result = await graph_service.initialize_graph()
        logger.info(f"Graph initialization completed: {result.get('status')}")
        return result
    except Exception as e:
        logger.error(f"Graph initialization failed: {e}")
        logger.exception("Full traceback:")
        from fastapi import HTTPException

        raise HTTPException(
            status_code=500, detail=f"Graph initialization failed: {str(e)}"
        )


@router.get("/health")
@inject
def health_check(
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
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
        result = graph_service.get_health_stats()
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
    graph_service: GraphService = Depends(Provide[GraphContainer.graph_service]),
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
        result = graph_service.get_table_dag(
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

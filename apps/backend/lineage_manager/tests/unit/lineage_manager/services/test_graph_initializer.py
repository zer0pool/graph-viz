import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from lineage_manager.services.graph_initializer import GraphInitializerService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.adapters.job_manager_adapter import JobManagerPort
from lineage_manager.models.scheduling_lineage import SchedulingLineage


class TestGraphInitializerService:

    @pytest.fixture
    def mock_job_manager(self):
        return MagicMock(spec=JobManagerPort)

    @pytest.fixture
    def mock_command_service(self):
        svc = MagicMock(spec=GraphCommandService)
        svc.uow = MagicMock()
        # Mock transactional context manager
        svc.uow.transactional.return_value.__enter__.return_value = svc.uow
        return svc

    @pytest.fixture
    def mock_query_service(self):
        return MagicMock(spec=GraphQueryService)

    @pytest.fixture
    def service(self, mock_job_manager, mock_command_service, mock_query_service):
        return GraphInitializerService(
            job_manager=mock_job_manager,
            command_service=mock_command_service,
            query_service=mock_query_service,
        )

    @pytest.mark.asyncio
    async def test_initialize_success(
        self, service, mock_job_manager, mock_command_service, mock_query_service
    ):
        # Mock job manager data
        mock_job_manager.get_all_jobs = AsyncMock(
            return_value=[
                SchedulingLineage(
                    job_id="job1", 
                    metadata={"name": "Job 1", "owner": ["owner1"], "project_name": "project1"}
                ),
                SchedulingLineage(
                    job_id="job2", 
                    metadata={"name": "Job 2", "owner": ["owner1"], "project_name": "project1"}
                ),
            ]
        )

        # Mock health stats
        mock_query_service.get_diagnostics.return_value = {
            "status": "healthy",
            "database": {"nodes": 2, "edges": 1},
        }

        result = await service.initialize()

        assert result["status"] == "success"
        assert result["successful_registrations"] == 2
        assert result["jobs_fetched"] == 2
        mock_command_service.reset_graph.assert_called_once()
        assert mock_command_service.register_lineage_job.call_count == 2

    @pytest.mark.asyncio
    async def test_initialize_partial_failure_with_fallback(
        self, service, mock_job_manager, mock_command_service, mock_query_service
    ):
        jobs = [
            SchedulingLineage(
                job_id="job1", 
                metadata={"name": "Job 1", "owner": ["owner1"], "project_name": "project1"}
            ),
            SchedulingLineage(
                job_id="job2", 
                metadata={"name": "Job 2", "owner": ["owner1"], "project_name": "project1"}
            ),
        ]
        mock_job_manager.get_all_jobs = AsyncMock(return_value=jobs)

        # Mock batch failure on first try
        # Note: transactional() is a context manager.
        # We need to make the first batch attempt fail, then the individual attempts work for job1 but fail for job2.

        # Batch call (optimistic)
        # In _process_batch_with_fallback, it calls register_lineage_job within a transactional block.
        # If we make register_lineage_job raise an error, the batch block will exit.

        call_count = 0

        def side_effect(job, compute_closure=True):
            nonlocal call_count
            call_count += 1
            if call_count == 1:  # Batch attempt first job
                raise Exception("Batch fail")
            if call_count == 2:  # Individual attempt first job
                return
            if call_count == 3:  # Individual attempt second job
                raise Exception("Individual fail")

        mock_command_service.register_lineage_job.side_effect = side_effect
        mock_query_service.get_diagnostics.return_value = {
            "status": "healthy",
            "database": {},
        }

        result = await service.initialize()

        assert result["status"] == "success"
        assert result["successful_registrations"] == 1
        assert result["failed_registrations"] == 1
        assert result["jobs_fetched"] == 2

    @pytest.mark.asyncio
    async def test_initialize_api_error(
        self, service, mock_job_manager, mock_command_service
    ):
        mock_job_manager.get_all_jobs = AsyncMock(side_effect=Exception("API Down"))

        result = await service.initialize()

        assert result["status"] == "error"
        assert "API Down" in result["message"]
        mock_command_service.reset_graph.assert_called_once()

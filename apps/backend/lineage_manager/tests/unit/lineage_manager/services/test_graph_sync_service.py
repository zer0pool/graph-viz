import pytest
from unittest.mock import MagicMock, AsyncMock
from lineage_manager.services.graph_sync_service import GraphSyncService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.graph_initializer import GraphInitializerService
from lineage_manager.adapters.job_manager_adapter import JobManagerAdapter
from lineage_manager.models.scheduling_lineage import SchedulingLineage


class TestGraphSyncService:

    @pytest.fixture
    def mock_uow(self):
        uow = MagicMock()
        uow.transactional.return_value.__enter__.return_value = uow
        return uow

    @pytest.fixture
    def mock_job_manager(self):
        return MagicMock(spec=JobManagerAdapter)

    @pytest.fixture
    def mock_command_service(self, mock_uow):
        svc = MagicMock(spec=GraphCommandService)
        svc.uow = mock_uow
        return svc

    @pytest.fixture
    def mock_query_service(self):
        return MagicMock(spec=GraphQueryService)

    @pytest.fixture
    def mock_initializer(self):
        return MagicMock(spec=GraphInitializerService)

    @pytest.fixture
    def service(
        self,
        mock_uow,
        mock_job_manager,
        mock_command_service,
        mock_query_service,
        mock_initializer,
    ):
        svc = GraphSyncService(
            uow=mock_uow,
            job_manager=mock_job_manager,
            command_service=mock_command_service,
            query_service=mock_query_service,
            initializer_service=mock_initializer,
        )
        return svc

    @pytest.mark.asyncio
    async def test_sync_job_from_manager_success(
        self, service, mock_job_manager, mock_command_service
    ):
        lineage = SchedulingLineage(
            job_id="job1",
            metadata={
                "name": "Job 1",
                "owner": ["owner1"],
                "project_name": "project1"
            }
        )
        mock_job_manager.get_job = AsyncMock(return_value=lineage)

        # sync_from_manager uses sync_from_lineage internally
        result = await service.sync_job_from_manager("job1")

        assert result["status"] == "success"
        mock_command_service.register_lineage_job.assert_called_once()

    @pytest.mark.asyncio
    async def test_sync_from_job_manager_delegates_to_initializer(
        self, service, mock_initializer
    ):
        mock_initializer.initialize = AsyncMock(return_value={"status": "success"})

        result = await service.sync_from_job_manager(reset=True)

        assert result["status"] == "success"
        mock_initializer.initialize.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_sync_multiple_jobs_success(
        self, service, mock_job_manager, mock_command_service
    ):
        lineages = [
            SchedulingLineage(
                job_id="job1", 
                metadata={"name": "Job 1", "owner": ["owner1"], "project_name": "project1"}
            ),
            SchedulingLineage(
                job_id="job2", 
                metadata={"name": "Job 2", "owner": ["owner1"], "project_name": "project1"}
            ),
        ]
        mock_job_manager.fetch_lineages_by_ids = AsyncMock(return_value=lineages)

        job_requests = [
            {"job_id": "job1", "type": "req"},
            {"job_id": "job2", "type": "req"},
        ]
        result = await service.sync_multiple_jobs(job_requests)

        assert result["status"] == "completed"
        assert result["successful"] == 2
        assert mock_command_service.register_lineage_job.call_count == 2

    @pytest.mark.asyncio
    async def test_sync_multiple_jobs_partial_failure(
        self, service, mock_job_manager, mock_command_service
    ):
        lineages = [
            SchedulingLineage(
                job_id="job1", 
                metadata={"name": "Job 1", "owner": ["owner1"], "project_name": "project1"}
            ),
            SchedulingLineage(
                job_id="job2", 
                metadata={"name": "Job 2", "owner": ["owner1"], "project_name": "project1"}
            ),
        ]
        mock_job_manager.fetch_lineages_by_ids = AsyncMock(return_value=lineages)

        # Make one succeed, one fail
        def side_effect(lineage):
            if lineage.job_id == "job2":
                raise Exception("Failure")
            return

        mock_command_service.register_lineage_job.side_effect = side_effect

        job_requests = [
            {"job_id": "job1", "type": "req"},
            {"job_id": "job2", "type": "req"},
        ]
        result = await service.sync_multiple_jobs(job_requests)

        assert result["status"] == "completed"
        assert result["successful"] == 0
        assert result["failed"] == 2
        assert result["results"][1]["status"] == "error"

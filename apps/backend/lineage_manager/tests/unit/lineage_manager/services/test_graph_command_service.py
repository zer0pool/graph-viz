import pytest
import pydantic_core
from unittest.mock import MagicMock, patch
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.api.v1.schemas import JobUpdateRequest
from lineage_manager.models.scheduling_lineage import SchedulingLineage


class TestGraphCommandServiceUoW:

    @pytest.fixture
    def mock_uow(self):
        uow = MagicMock(spec=GraphUnitOfWork)
        # Configure instance attributes
        uow.jobs = MagicMock()
        uow.tables = MagicMock()
        uow.job_table_links = MagicMock()
        uow.edges = MagicMock()
        uow.closures = MagicMock()
        uow.db = MagicMock()
        uow.job_node = MagicMock()
        uow.table_node = MagicMock()
        uow.project = MagicMock()
        uow.users = MagicMock()
        uow.data_node = MagicMock()

        # Mock context manager behavior
        uow.__enter__.return_value = uow
        uow.__exit__.return_value = None  # Don't suppress exceptions
        return uow

    @pytest.fixture
    def mock_job_manager(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_uow, mock_job_manager):
        return GraphCommandService(uow=mock_uow, job_manager=mock_job_manager)


    def test_register_lineage_job_does_not_use_uow_context(self, service, mock_uow):
        """Verifies that register_lineage_job does NOT manage its own transactions."""
        lineage = SchedulingLineage(
            job_id="test_job",
            metadata={
                "name": "Test Job",
                "owner": ["test_owner"]
            }
        )

        # Mock internal methods
        with patch.object(service, "_extract_job_properties") as mock_extract:
            mock_extract.return_value = {"owners": ["test_owner"]}
            mock_uow.jobs.get.return_value = None
            mock_uow.jobs.get_or_create.return_value = MagicMock(
                id=1, job_id="test_job"
            )

            service.register_lineage_job(lineage)

            # Verification: MUST NOT use context manager internally
            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

    def test_toggle_job_enabled_does_not_use_uow_context(self, service, mock_uow):
        job_id = "job-1"
        mock_job = MagicMock()
        mock_job.job_metadata = {"enabled": True}
        mock_uow.jobs.get.return_value = mock_job

        service.toggle_job_enabled(job_id)

        mock_uow.__enter__.assert_not_called()
        mock_uow.__exit__.assert_not_called()

    def test_update_job_does_not_use_uow_context_on_update(self, service, mock_uow):
        job_id = "job-1"
        mock_job = MagicMock()
        mock_job.job_metadata = {}
        mock_uow.jobs.get.return_value = mock_job

        payload = JobUpdateRequest(enabled=False)

        service.update_job(job_id, payload)

        mock_uow.__enter__.assert_not_called()
        mock_uow.__exit__.assert_not_called()

    def test_reset_graph_does_not_use_uow_context(self, service, mock_uow):
        with patch.object(service, "_invalidate_all_caches"):
            service.reset_graph()

            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

            mock_uow.closures.clear_all.assert_called()
            mock_uow.edges.clear_all.assert_called()
            mock_uow.job_node.clear_all.assert_called()
            mock_uow.data_node.clear_all.assert_called()

            # verify we DON'T clear administrative tables
            mock_uow.project.clear_all.assert_not_called()
            mock_uow.users.clear_catalog_users.assert_not_called()

    def test_set_table_dependency_does_not_use_uow_context(self, service, mock_uow):
        table_name = "t1"
        job_id = "j1"

        mock_uow.tables.get_by_full_name.return_value = MagicMock(id=1)
        mock_job = MagicMock()
        mock_job.id = 2
        mock_job.trigger_tables = []
        mock_uow.jobs.get.return_value = mock_job

        with patch.object(service, "_invalidate_dependency_cache"):
            service.set_table_dependency(table_name, job_id, True)

            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

    def test_bulk_set_table_dependencies_does_not_use_uow_context(
        self, service, mock_uow
    ):
        table_name = "t1"

        mock_uow.tables.get_by_full_name.return_value = MagicMock(id=1)
        mock_job = MagicMock(job_id="j1")
        mock_job.trigger_tables = []
        mock_uow.job_table_links.get_jobs_by_table_and_io_type.return_value = [mock_job]

        with patch.object(service, "_invalidate_dependency_cache"):
            service.bulk_set_table_dependencies(table_name, True)

            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()


    def test_register_lineage_job_validation_rejects_empty_ids(self, service):
        # Empty ID - now caught by Pydantic during model instantiation
        with pytest.raises(pydantic_core.ValidationError, match="job_id cannot be empty"):
             SchedulingLineage(
                job_id="",
                metadata={
                    "name": "Valid",
                    "owner": ["owner"]
                }
            )

        # Empty Name - caught by Pydantic validation (min_length=1 suggested)
        # For now, just test that service or pydantic catches it.
        # Let's check what actually happens.

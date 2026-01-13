
import pytest
from unittest.mock import MagicMock, patch
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.api.v1.schemas import JobRegister, JobUpdateRequest
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

    def test_register_job_does_not_use_uow_context(self, service, mock_uow):
        """Verifies that GraphCommandService does NOT manage its own transactions."""
        job_data = MagicMock(spec=JobRegister)
        job_data.job_id = "test_job"
        job_data.name = "Test Job"
        job_data.reference_tables = []
        job_data.trigger_tables = []
        job_data.destination_tables = []
        
        # Mock internal methods to avoid complex logic
        with patch.object(service, '_create_job_node') as mock_create, \
             patch.object(service, '_process_input_tables'), \
             patch.object(service, '_process_destination_tables'), \
             patch.object(service, '_create_upstream_relationships'), \
             patch.object(service, '_create_downstream_relationships'):
            
            mock_create.return_value.job_id = "test_job"
            mock_create.return_value.id = "123"
            
            service.register_job(job_data)

            # Verification: MUST NOT use context manager internally
            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

    def test_register_lineage_job_does_not_use_uow_context(self, service, mock_uow):
        """Verifies that register_lineage_job does NOT manage its own transactions."""
        lineage = SchedulingLineage(
            job_id="test_job",
            type="SELF",
            name="Test Job",
            status="RUNNING"
        )
        
        # Mock internal methods
        with patch.object(service, '_extract_job_properties') as mock_extract:
            mock_extract.return_value = {"owner": "test"}
            mock_uow.jobs.get.return_value = None
            mock_uow.jobs.get_or_create.return_value = MagicMock(id=1, job_id="test_job")
            
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
        with patch.object(service, '_invalidate_all_caches'):
            service.reset_graph()
            
            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()
            
            mock_uow.closures.clear_all.assert_called()
            mock_uow.edges.clear_all.assert_called()

    def test_set_table_dependency_does_not_use_uow_context(self, service, mock_uow):
        table_name = "t1"
        job_id = "j1"
        
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id=1)
        mock_job = MagicMock()
        mock_job.id = 2
        mock_job.trigger_tables = []
        mock_uow.jobs.get.return_value = mock_job
        
        with patch.object(service, '_invalidate_dependency_cache'):
            service.set_table_dependency(table_name, job_id, True)

            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

    def test_bulk_set_table_dependencies_does_not_use_uow_context(self, service, mock_uow):
        table_name = "t1"
        
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id=1)
        mock_job = MagicMock(job_id="j1")
        mock_job.trigger_tables = []
        mock_uow.job_table_links.get_jobs_by_table_and_io_type.return_value = [mock_job]
        
        with patch.object(service, '_invalidate_dependency_cache'):
            service.bulk_set_table_dependencies(table_name, True)
            
            mock_uow.__enter__.assert_not_called()
            mock_uow.__exit__.assert_not_called()

    def test_validation_rejects_empty_job_id(self, service):
        job_data = MagicMock(spec=JobRegister)
        job_data.job_id = ""
        job_data.name = "Valid Name"
        
        with pytest.raises(ValueError, match="job_id cannot be empty"):
            service.register_job(job_data)

    def test_validation_rejects_empty_job_name(self, service):
        job_data = MagicMock(spec=JobRegister)
        job_data.job_id = "valid_id"
        job_data.name = "   "
        
        with pytest.raises(ValueError, match="job name cannot be empty"):
            service.register_job(job_data)

    def test_register_lineage_job_validation_rejects_empty_ids(self, service):
        # Empty ID
        l1 = SchedulingLineage(job_id="", type="SELF", name="Valid", status="RUN")
        with pytest.raises(ValueError, match="job_id cannot be empty"):
            service.register_lineage_job(l1)
            
        # Empty Name
        l2 = SchedulingLineage(job_id="valid", type="SELF", name="  ", status="RUN")
        with pytest.raises(ValueError, match="job name cannot be empty"):
            service.register_lineage_job(l2)

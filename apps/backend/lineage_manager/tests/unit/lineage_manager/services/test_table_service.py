import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from lineage_manager.services.table_service import TableService
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.services.graph_command_service import GraphCommandService
from lineage_manager.services.bigquery_protocol import BigQueryServiceProtocol


class TestTableService:

    @pytest.fixture
    def mock_query_service(self):
        return MagicMock(spec=GraphQueryService)

    @pytest.fixture
    def mock_command_service(self):
        svc = MagicMock(spec=GraphCommandService)
        svc.uow = MagicMock()
        # Mock transaction manager behavior
        svc.uow.transactional.return_value.__enter__.return_value = svc.uow
        svc.uow.transactional.return_value.__exit__.return_value = None
        return svc

    @pytest.fixture
    def mock_bigquery_service(self):
        return MagicMock(spec=BigQueryServiceProtocol)

    @pytest.fixture
    def service(self, mock_query_service, mock_command_service, mock_bigquery_service):
        return TableService(
            query_service=mock_query_service,
            command_service=mock_command_service,
            bigquery_service=mock_bigquery_service,
        )

    def test_get_table_impact(self, service, mock_query_service):
        mock_query_service.get_table_impact.return_value = {"status": "success"}
        result = service.get_table_impact("test_table", 3, True)

        mock_query_service.get_table_impact.assert_called_once_with(
            base_table="test_table", max_depth=3, include_jobs=True
        )
        assert result == {"status": "success"}

    def test_get_table_dependencies_external(self, service, mock_query_service):
        mock_query_service.get_table_dependencies.return_value = {
            "status": "success",
            "count": 0,
        }
        result = service.get_table_dependencies("s3://bucket/path")

        assert result["status"] == "success"
        assert result["count"] == 0
        mock_query_service.get_table_dependencies.assert_called_once_with(
            "s3://bucket/path"
        )

    def test_get_table_dependencies_internal(self, service, mock_query_service):
        mock_query_service.get_table_dependencies.return_value = {"status": "success"}
        result = service.get_table_dependencies("dataset.table")

        mock_query_service.get_table_dependencies.assert_called_once_with(
            "dataset.table"
        )
        assert result == {"status": "success"}

    def test_get_table_lineage_summary_fixes_schema(self, service, mock_query_service):
        mock_query_service.get_table_lineage_summary.return_value = {
            "status": "success",
            "upstream": {},
        }
        result = service.get_table_lineage_summary("table", 50, 50)

        # Verify schema fixes
        assert "root_tables" in result["upstream"]
        assert "leaf_tables" in result["upstream"]
        assert "downstream" in result
        assert "leaf_tables" in result["downstream"]
        assert "root_tables" in result["downstream"]

    @pytest.mark.asyncio
    @patch("lineage_manager.services.table_service.broker", new_callable=AsyncMock)
    async def test_set_table_dependency_success(
        self, mock_broker, service, mock_command_service
    ):
        mock_command_service.set_table_dependency.return_value = {
            "status": "success",
            "job_id": "job1",
        }

        result = await service.set_table_dependency("table", "job1", True)

        mock_command_service.set_table_dependency.assert_called_once_with(
            "table", "job1", True
        )
        mock_broker.publish.assert_called_once_with("trigger_update", result)
        assert result["status"] == "success"

    @pytest.mark.asyncio
    @patch("lineage_manager.services.table_service.broker", new_callable=AsyncMock)
    async def test_bulk_set_table_dependencies(
        self, mock_broker, service, mock_command_service
    ):
        mock_command_service.bulk_set_table_dependencies.return_value = {
            "status": "success",
            "changed": ["job1", "job2"],
        }

        result = await service.bulk_set_table_dependencies("table", False)

        assert mock_broker.publish.call_count == 2
        mock_broker.publish.assert_any_call(
            "trigger_update",
            {
                "status": "success",
                "job_id": "job1",
                "table_name": "table",
                "previous_state": None,
                "new_state": False,
            },
        )

    def test_get_table_details_external(self, service):
        result = service.get_table_details("gs://bucket/path")
        assert result["result"]["table_type"] == "EXTERNAL"
        assert result["result"]["full_name"] == "gs://bucket/path"

    def test_get_table_details_demo_fallback(self, service, mock_bigquery_service):
        # The current implementation does not have demo fallback, it returns an error
        mock_bigquery_service.get_table_detail.side_effect = Exception("Not found")

        result = service.get_table_details("real_table")

        assert result["status"] == "error"
        assert result["result"]["full_name"] == "real_table"

import pytest
from unittest.mock import MagicMock
from lineage_manager.services.graph_query_service import GraphQueryService

class MockNode:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

class TestBatchDetails:

    @pytest.fixture
    def mock_uow(self):
        uow = MagicMock()
        uow.nodes = MagicMock()
        uow.job_table_links = MagicMock()
        return uow

    @pytest.fixture
    def service(self, mock_uow):
        return GraphQueryService(uow=mock_uow)

    def test_get_nodes_batch_details_population(self, service, mock_uow):
        # Setup mock job node
        job_node = MockNode(
            id=1,
            node_type="job",
            name="my_project.my_job",
            properties={
                "status": "DEPLOYED",
                "owners": ["owner1", "owner2"],
                "type": "sql",
                "schedule": {"cron": "@daily"}
            },
            owners=["owner1", "owner2"],
            write_mode=None,
            storage_type=None
        )

        mock_uow.nodes.get_by_names.return_value = [job_node]
        mock_uow.job_table_links.get_producer_jobs_by_table_ids.return_value = []

        result = service.get_nodes_batch_details(["my_project.my_job"])

        assert result["status"] == "success"
        res = result["results"]["my_project.my_job"]
        
        # Verify job_info population
        job_info = res["job_info"]
        assert job_info["job_id"] == "my_project.my_job"
        assert job_info["owners"] == ["owner1", "owner2"]
        assert job_info["status"] == "DEPLOYED"
        assert job_info["interval"] == "@daily"
        assert job_info["type"] == "sql"

    def test_get_nodes_batch_details_table_with_producer(self, service, mock_uow):
        table_node = MockNode(
            id=100,
            node_type="table",
            name="schema.table",
            properties={"full_name": "schema.table"},
            write_mode="APPEND",
            storage_type="bigquery"
        )

        producer_job = MockNode(
            id=200,
            name="producer_job",
            node_type="job",
            properties={
                "status": "RUNNING",
                "owners": ["producer_owner"],
                "type": "python"
            },
            owners=["producer_owner"]
        )

        mock_uow.nodes.get_by_names.return_value = [table_node]
        mock_uow.job_table_links.get_producer_jobs_by_table_ids.return_value = [(100, producer_job)]

        result = service.get_nodes_batch_details(["schema.table"])

        res = result["results"]["schema.table"]
        
        # Table info
        assert res["table_info"]["write_mode"] == "APPEND"
        assert res["table_info"]["storage_type"] == "bigquery"
        
        # Producer job info
        assert res["job_info"]["job_id"] == "producer_job"
        assert res["job_info"]["owners"] == ["producer_owner"]
        assert res["job_info"]["status"] == "RUNNING"
        assert res["job_info"]["type"] == "python"

    def test_get_nodes_batch_details_not_found(self, service, mock_uow):
        mock_uow.nodes.get_by_names.return_value = []

        result = service.get_nodes_batch_details(["not_exists"])

        res = result["results"]["not_exists"]
        assert res["table_info"]["type"] == "unknown"
        assert res["job_info"]["status"] == "not_found"
        assert res["job_info"]["job_meta"] is None

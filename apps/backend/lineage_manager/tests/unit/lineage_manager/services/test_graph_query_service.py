import pytest
from unittest.mock import MagicMock, patch
from lineage_manager.services.graph_query_service import GraphQueryService
from lineage_manager.core.uow import GraphUnitOfWork

class TestGraphQueryService:

    @pytest.fixture
    def mock_uow(self):
        uow = MagicMock(spec=GraphUnitOfWork)
        uow.read_uow = MagicMock()
        uow.nodes = MagicMock()
        uow.edges = MagicMock()
        uow.tables = MagicMock()
        uow.triggers = MagicMock()
        uow.jobs = MagicMock()
        uow.closures = MagicMock()
        uow.job_table_links = MagicMock()
        uow.db = MagicMock()
        return uow

    @pytest.fixture
    @patch("lineage_manager.services.graph_query_service.GraphTraversalHelper")
    def service(self, mock_traversal_class, mock_uow):
        svc = GraphQueryService(uow=mock_uow)
        svc.mock_traversal = mock_traversal_class.return_value
        return svc

    def test_get_health_stats(self, service, mock_uow):
        mock_uow.jobs.list_all.return_value = [1, 2, 3]
        mock_uow.tables.count_tables.return_value = 10
        mock_uow.edges.count_all.return_value = 15
        mock_uow.closures.count_all.return_value = 20
        mock_uow.db.execute.return_value = MagicMock()
        
        result = service.get_health_stats()
        
        assert result["status"] == "healthy"
        assert result["database"]["job_count"] == 3
        assert result["database"]["table_count"] == 10

    def test_get_table_impact(self, service, mock_uow):
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id="t1", full_name="table1")
        mock_uow.job_table_links.get_jobs_by_table_and_io_type.return_value = []
        
        result = service.get_table_impact("table1", max_depth=3, include_jobs=True)
        
        assert result["base_table"] == "table1"
        assert "downstream" in result

    def test_get_table_dependencies(self, service, mock_uow):
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id="t1")
        mock_uow.job_table_links.get_job_inputs_with_trigger_flag.return_value = [
            (MagicMock(job_id="j1", display_name="job1"), True)
        ]
        
        result = service.get_table_dependencies("table1")
        
        assert result["status"] == "success"
        assert len(result["jobs"]) == 1
        assert result["jobs"][0]["name"] == "job1"
        assert result["jobs"][0]["trigger"] is True

    def test_get_table_lineage_hierarchy(self, service, mock_uow):
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id="t1", full_name="table1")
        service.mock_traversal.bfs_lineage_hierarchy.side_effect = lambda *args, **kwargs: []
        service.mock_traversal.find_root_and_leaf_nodes.return_value = ([], [])
        
        result = service.get_table_lineage_hierarchy("table1")
        
        assert result["status"] == "success"
        assert len(result["upstream"]) == 1 # includes center node
        assert result["upstream"][0]["id"] == "table1"

    def test_get_table_lineage_summary(self, service, mock_uow):
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id="t1", full_name="table1")
        mock_uow.job_table_links.get_jobs_by_table_and_io_type.return_value = []
        
        result = service.get_table_lineage_summary("table1")
        
        assert result["status"] == "success"
        assert result["table"] == "table1"

    def test_get_lineage_graph(self, service, mock_uow):
        from lineage_manager.api.v1.schemas import MermaidGraphResponse, GraphMetadata
        mock_uow.tables.get_by_full_name.return_value = MagicMock(id="t1", full_name="table1")
        service.mock_traversal.bfs_neighbors.return_value = {"nodes": [], "edges": []}
        
        result = service.get_lineage_graph("table:table1", depth=1)
        
        assert isinstance(result, MermaidGraphResponse)
        assert result.metadata.depth == 1

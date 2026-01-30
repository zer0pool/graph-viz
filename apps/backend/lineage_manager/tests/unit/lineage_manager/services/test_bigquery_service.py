import pytest
from lineage_manager.services.dummy_bigquery_service import DummyBigQueryService


class TestBigQueryService:

    @pytest.fixture
    def service(self):
        return DummyBigQueryService()

    def test_get_table_detail(self, service):
        result = service.get_table_detail("test_table")
        assert result["full_name"] == "test_table"
        assert result["table_type"] == "TABLE"
        assert "storage" in result

    def test_get_table_schema(self, service):
        result = service.get_table_schema("any_table")
        assert isinstance(result, list)
        assert len(result) > 0
        assert "name" in result[0]
        assert "type" in result[0]

    def test_get_table_load_history(self, service):
        result = service.get_table_load_history("any_table")
        assert isinstance(result, list)
        for item in result:
            assert "start_time" in item
            assert "updated_at" in item
            assert "status" in item

    def test_get_table_timelines_for_table(self, service):
        result = service.get_table_timelines_for_table("any_table", 7)
        assert "daily_summary" in result
        assert "hourly_detail" in result
        assert isinstance(
            (
                result["hourly_detail"]["2025-12-14"]
                if "2025-12-14" in result["hourly_detail"]
                else list(result["hourly_detail"].values())[0]
            ),
            list,
        )

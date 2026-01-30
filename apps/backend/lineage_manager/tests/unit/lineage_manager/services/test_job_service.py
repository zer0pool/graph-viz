import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timezone
from lineage_manager.services.job_service import JobService
from lineage_manager.adapters.job_manager_adapter import JobManagerPort


class TestJobService:

    @pytest.fixture
    def mock_job_manager(self):
        return MagicMock(spec=JobManagerPort)

    @pytest.fixture
    def service(self, mock_job_manager):
        return JobService(job_manager=mock_job_manager)

    @pytest.mark.asyncio
    async def test_get_run_history_success(self, service, mock_job_manager):
        # Mock adapter response
        mock_job_manager.get_job_run_history = AsyncMock()
        mock_job_manager.get_job_run_history.return_value = [
            {
                "dag_run_id": "manual__2025-12-20T11:00:00+00:00",
                "state": "success",
                "start_time": "2025-12-20T11:00:00Z",
                "finish_time": "2025-12-20T11:05:00Z",
            },
            {
                "dag_run_id": "scheduler__2025-12-20T10:00:00+00:00",
                "state": "failed",
                "start_time": "2025-12-20T10:00:00Z",
                "finish_time": "2025-12-20T10:10:00Z",
            },
        ]

        result = await service.get_run_history("test-job")

        assert result["status"] == "success"
        timeline = result["result"]["timeline"]
        assert len(timeline) == 2

        # Check first item (success)
        assert timeline[0]["status"] == "success"
        assert timeline[0]["duration_sec"] == 300
        assert timeline[0]["triggered_by"] == "manual"

        # Check summary
        summary = result["result"]["summary"]
        assert summary["total"] == 2
        assert summary["success"] == 1
        assert summary["failed"] == 1

    @pytest.mark.asyncio
    async def test_get_run_history_adapter_error(self, service, mock_job_manager):
        mock_job_manager.get_job_run_history = AsyncMock()
        mock_job_manager.get_job_run_history.side_effect = Exception("Adapter error")

        from fastapi import HTTPException

        with pytest.raises(HTTPException) as excinfo:
            await service.get_run_history("test-job")

        assert excinfo.value.status_code == 502
        assert "Job Manager error" in excinfo.value.detail

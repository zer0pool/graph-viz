import pytest
from unittest.mock import AsyncMock, MagicMock
from app.application.usecase.job_explorer.search_jobs import SearchJobsUseCase
from app.domain.entity.job import JobRunContext

class MockRepo:
    def get_recent_runs(self, days=30):
        return [
            {"job_id": "job1", "execution_time": "2025-01-01T00:00:00Z"},
            {"job_id": "job2", "execution_time": "2025-01-01T00:00:00Z"}
        ]

class MockGateway:
    async def get_jobs_batch(self, job_ids):
        return {
            "job1": {"name": "Test Job 1", "properties": {"type": "SELF-TYPE"}},
            "job2": {"name": "Test Job 2", "properties": {"type": "REQUEST-TYPE"}}
        }

@pytest.mark.asyncio
async def test_search_jobs_usecase_no_cache():
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None  # Cache miss
    
    repo = MockRepo()
    gw = MockGateway()
    
    uc = SearchJobsUseCase(repo=repo, lineage_gateway=gw, redis=mock_redis)
    
    results = await uc.execute(refresh=False)
    assert len(results) == 2
    assert results[0]["name"] == "Test Job 1"
    assert results[0]["issuer"] == "Self Scheduling"
    
    assert results[1]["name"] == "Test Job 2"
    assert results[1]["issuer"] == "Data Scheduling"
    
    mock_redis.set.assert_called_once()

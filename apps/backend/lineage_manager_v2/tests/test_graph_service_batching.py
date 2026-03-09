from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.graph_service import GraphService


@pytest.mark.asyncio
async def test_initialize_graph_batching():
    uow = AsyncMock()
    # Mocking self.uow as an async context manager
    uow.__aenter__.return_value = uow

    # Repositories
    uow.graph = AsyncMock()
    uow.projects = AsyncMock()
    uow.jobs = AsyncMock()
    uow.data_nodes = AsyncMock()
    uow.users = AsyncMock()

    job_manager_client = AsyncMock()

    # 3 mock jobs for batch_size=2
    job_manager_client.fetch_scheduling_lineage.return_value = [
        {
            "job_id": "job.1",
            "metadata": {"name": "Job 1", "project_name": "p1", "owner": ["u1"]},
            "upstreams": [],
            "downstreams": [],
        },
        {
            "job_id": "job.2",
            "metadata": {"name": "Job 2", "project_name": "p1", "owner": ["u1"]},
            "upstreams": [],
            "downstreams": [],
        },
        {
            "job_id": "job.3",
            "metadata": {"name": "Job 3", "project_name": "p2", "owner": ["u2"]},
            "upstreams": [],
            "downstreams": [],
        },
    ]

    service = GraphService(uow, job_manager_client)

    # Test with batch_size=2
    result = await service.initialize_graph(drop_existing=True, batch_size=2)

    # Verify behavior
    assert "Discovery complete" in result
    assert "3 jobs" in result

    # clear_graph_data should be called once because drop_existing=True
    uow.graph.clear_graph_data.assert_called_once()

    # fetch_scheduling_lineage should be called once
    job_manager_client.fetch_scheduling_lineage.assert_called_once()

    # commit should be called multiple times (1 for clear_graph_data, 1 for batch 1, 1 for batch 2)
    # Actually:
    # 1. async with self.uow: clear_graph_data + commit (if drop_existing)
    # 2. Batch loop:
    #    async with self.uow: ... + commit (Batch 1)
    #    async with self.uow: ... + commit (Batch 2)
    assert uow.commit.call_count == 3

    # verify project save
    assert uow.projects.save.call_count == 2  # p1, p2

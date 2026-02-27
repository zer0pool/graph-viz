import pytest
from httpx import AsyncClient
from fastapi import status

@pytest.mark.asyncio
async def test_initialize_graph(client: AsyncClient):
    """
    Test triggering graph initialization.
    """
    response = await client.post("/api/v1/graph/init?drop_existing=true")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "accepted"
    assert "task_id" in data

@pytest.mark.asyncio
async def test_diagnose_graph(client: AsyncClient):
    """
    Test fetching graph diagnostics/stats.
    """
    response = await client.get("/api/v1/graph/diagnose")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "projects" in data
    assert "jobs" in data
    assert "graph" in data
    assert "nodes" in data["graph"]
    assert "edges" in data["graph"]

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_lineage_flow(client: AsyncClient):
    # 1. Register Lineage: Table A -> Job B -> Table C
    edges = [
        {
            "source_type": "table",
            "source_name": "db.table_a",
            "target_type": "job",
            "target_name": "job_b",
            "edge_type": "lineage",
        },
        {
            "source_type": "job",
            "source_name": "job_b",
            "target_type": "table",
            "target_name": "db.table_c",
            "edge_type": "lineage",
        },
    ]
    res = await client.post("/api/v1/lineage/register", json={"edges": edges})
    assert res.status_code == 201

    # 2. Query Downstream from Table A
    res = await client.get(
        "/api/v1/lineage/graph/table/db.table_a?direction=downstream"
    )
    assert res.status_code == 200
    data = res.json()
    # Should see db.table_a, job_b, db.table_c
    node_names = [n["name"] for n in data["nodes"]]
    assert "db.table_a" in node_names
    assert "job_b" in node_names
    assert "db.table_c" in node_names
    assert len(data["edges"]) == 2

    # 3. Query Upstream from Table C
    res = await client.get("/api/v1/lineage/graph/table/db.table_c?direction=upstream")
    assert res.status_code == 200
    data = res.json()
    node_names = [n["name"] for n in data["nodes"]]
    assert "db.table_a" in node_names
    assert "job_b" in node_names
    assert "db.table_c" in node_names

    # 4. Query with depth limit
    res = await client.get(
        "/api/v1/lineage/graph/table/db.table_a?direction=downstream&depth=1"
    )
    assert res.status_code == 200
    data = res.json()
    node_names = [n["name"] for n in data["nodes"]]
    assert "db.table_a" in node_names
    assert "job_b" in node_names
    assert "db.table_c" not in node_names  # Depth 1 only reaches job_b

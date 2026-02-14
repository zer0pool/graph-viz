import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_resource_flow(client: AsyncClient):
    # 1. Create Project
    res = await client.post(
        "/api/v1/projects/",
        json={"project_id": "api-proj", "display_name": "API Test Project"},
    )
    assert res.status_code == 201
    assert res.json()["project_id"] == "api-proj"

    # 2. Create Job
    res = await client.post(
        "/api/v1/jobs/",
        json={
            "project_id": "api-proj",
            "name": "api-job",
            "owners": ["user-1"],
            "properties": {"job_id": "fqn.api-job", "type": "spark"},
        },
    )
    assert res.status_code == 201
    assert res.json()["job_id"] == "fqn.api-job"

    # 3. Create Resource
    res = await client.post(
        "/api/v1/resources/",
        json={
            "project_id": "api-proj",
            "fqn": "dataset.table_a",
            "data_type": "BIGQUERY",
            "data_info": {"schema": "v1"},
        },
    )
    assert res.status_code == 201

    # 4. Get Project Jobs
    res = await client.get("/api/v1/projects/api-proj/jobs")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    assert res.json()[0]["name"] == "api-job"

    # 5. Get Resource by FQN
    res = await client.get("/api/v1/resources/dataset.table_a")
    assert res.status_code == 200
    assert res.json()["fqn"] == "dataset.table_a"

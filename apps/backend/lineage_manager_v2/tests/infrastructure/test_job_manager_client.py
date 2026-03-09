import pytest
import respx
from httpx import Response

from app.infrastructure.external.job_manager_client import JobManagerClient


@pytest.mark.asyncio
async def test_fetch_scheduling_lineage_pagination():
    client = JobManagerClient(base_url="http://mock-job-manager")

    # Mock data for SELF-TYPE (2 pages)
    page1_self = {"result": [{"job_id": "self.1"}], "pagination": {"next_offset": 1}}
    page2_self = {"result": [{"job_id": "self.2"}], "pagination": {"next_offset": None}}

    # Mock data for REQUEST-TYPE (1 page)
    page1_req = {"result": [{"job_id": "req.1"}], "pagination": {"next_offset": None}}

    with respx.mock:
        # SELF-TYPE page 1
        respx.get(
            "http://mock-job-manager/api/v1/jobs/scheduling-lineage/",
            params={"scheduling_type": "SELF-TYPE", "limit": 1000, "offset": 0},
        ).mock(return_value=Response(200, json=page1_self))
        # SELF-TYPE page 2
        respx.get(
            "http://mock-job-manager/api/v1/jobs/scheduling-lineage/",
            params={"scheduling_type": "SELF-TYPE", "limit": 1000, "offset": 1},
        ).mock(return_value=Response(200, json=page2_self))
        # REQUEST-TYPE page 1
        respx.get(
            "http://mock-job-manager/api/v1/jobs/scheduling-lineage/",
            params={"scheduling_type": "REQUEST-TYPE", "limit": 1000, "offset": 0},
        ).mock(return_value=Response(200, json=page1_req))

        jobs = await client.fetch_scheduling_lineage(batch_size=1000)

        assert len(jobs) == 3
        assert jobs[0]["job_id"] == "self.1"
        assert jobs[1]["job_id"] == "self.2"
        assert jobs[2]["job_id"] == "req.1"


@pytest.mark.asyncio
async def test_fetch_scheduling_lineage_error_handling():
    client = JobManagerClient(base_url="http://mock-job-manager")

    with respx.mock:
        respx.get("http://mock-job-manager/api/v1/jobs/scheduling-lineage/").mock(
            return_value=Response(500)
        )

        # Should not raise exception, just return empty list or partial list
        jobs = await client.fetch_scheduling_lineage()
        assert len(jobs) == 0

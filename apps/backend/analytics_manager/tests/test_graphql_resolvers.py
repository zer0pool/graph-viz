import pytest
from app.api.graphql.resolvers import Query
from app.api.graphql.schema import JobFilter


class DummyService:
    async def get_recent_job_runs(self):
        # two simple records for filtering
        return [
            {
                "job_id": "a",
                "name": "Alpha",
                "project_id": "proj1",
                "owners": ["bob"],
                "status": "RUNNING",
            },
            {
                "job_id": "b",
                "name": "Beta",
                "project_id": "proj2",
                "owners": ["alice"],
                "status": "SUCCESS",
            },
        ]


class DummyContainer:
    async def job_explorer_service(self):
        return DummyService()


class DummyInfo:
    def __init__(self):
        self.context = {"container": DummyContainer()}


@pytest.mark.asyncio
async def test_jobs_filtering_search_term():
    q = Query()
    info = DummyInfo()
    res = await q.jobs(info, first=10, filter=JobFilter(search_term="Alpha"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Alpha"


@pytest.mark.asyncio
async def test_jobs_filtering_project():
    q = Query()
    info = DummyInfo()
    res = await q.jobs(info, first=10, filter=JobFilter(project_id="proj2"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Beta"


@pytest.mark.asyncio
async def test_jobs_filtering_owner():
    q = Query()
    info = DummyInfo()
    res = await q.jobs(info, first=10, filter=JobFilter(owner="bob"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Alpha"

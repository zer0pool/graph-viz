import pytest
from app.api.graphql.resolvers import Query
from app.api.graphql.schema import JobFilter
from app.domain.entity.job import JobRunContext

class DummyJobsUseCase:
    async def execute(self, days: int = 30, refresh: bool = False):
        return [
            {
                "job_id": "a", "dag_id": "", "execution_time": "", "next_start_time": "", 
                "publish_time": "", "issuer": "System", "duration": 10, "progress": 1.0, 
                "name": "Alpha", "project_id": "proj1", "owners": ["bob"], "status": "RUNNING",
                "type": "SELF-TYPE", "destination": "", "period": "", "date": "", "hour": ""
            },
            {
                "job_id": "b", "dag_id": "", "execution_time": "", "next_start_time": "", 
                "publish_time": "", "issuer": "System", "duration": 20, "progress": 1.0, 
                "name": "Beta", "project_id": "proj2", "owners": ["alice"], "status": "SUCCESS",
                "type": "SELF-TYPE", "destination": "", "period": "", "date": "", "hour": ""
            },
        ]

class DummyInfo:
    def __init__(self):
        self.context = {"jobs_uc": DummyJobsUseCase()}


@pytest.mark.asyncio
async def test_jobs_filtering_search_term():
    q = Query()
    info = DummyInfo()
    res = await q.jobs(info, first=10, filter=JobFilter(search_term="a"))
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

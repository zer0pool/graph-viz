import pytest
from unittest.mock import AsyncMock

from app.api.graphql.request_cache import RequestCache
from app.api.graphql.resolvers import Query
from app.api.graphql.schema import JobFilter, JobRunFilter, SortOrder

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

SAMPLE_RUNS = [
    {
        "job_id": "a", "dag_id": "dag_a",
        "execution_time": "2025-01-01T00:00:00Z",
        "next_start_time": "2025-01-02T00:00:00Z",
        "publish_time": "2025-01-01T01:00:00Z",
        "issuer": "Self Scheduling", "duration": 10, "progress": 1.0,
        "name": "Alpha", "project_id": "proj1", "owners": ["bob"],
        "status": "RUNNING", "type": "SELF-TYPE",
        "destination": "dest_a", "period": "daily", "date": "2025-01-01", "hour": "0",
    },
    {
        "job_id": "b", "dag_id": "dag_b",
        "execution_time": "2025-01-03T00:00:00Z",
        "next_start_time": "2025-01-04T00:00:00Z",
        "publish_time": "2025-01-03T01:00:00Z",
        "issuer": "Data Scheduling", "duration": 20, "progress": 0.5,
        "name": "Beta", "project_id": "proj2", "owners": ["alice"],
        "status": "SUCCESS", "type": "REQUEST-TYPE",
        "destination": "dest_b", "period": "hourly", "date": "2025-01-03", "hour": "1",
    },
    {
        "job_id": "c", "dag_id": "dag_c",
        "execution_time": "2025-01-05T00:00:00Z",
        "next_start_time": "",
        "publish_time": "2025-01-05T01:00:00Z",
        "issuer": "System", "duration": 300, "progress": 0.0,
        "name": "Gamma", "project_id": "proj1", "owners": ["bob", "carol"],
        "status": "ERROR", "type": "SELF-TYPE",
        "destination": "dest_a", "period": "daily", "date": "2025-01-05", "hour": "0",
    },
]


class DummyJobsUseCase:
    def __init__(self, runs=None, capture_calls=False):
        self._runs = runs if runs is not None else SAMPLE_RUNS
        self.calls = []
        self._capture = capture_calls

    async def execute(self, days: int = 30, refresh: bool = False):
        if self._capture:
            self.calls.append({"days": days, "refresh": refresh})
        return self._runs


class DummyInfo:
    def __init__(self, uc=None):
        self.context = {
            "jobs_uc": uc or DummyJobsUseCase(),
            "cache": RequestCache(),
        }


# ===========================================================================
# jobs resolver (existing tests — kept intact)
# ===========================================================================

@pytest.mark.asyncio
async def test_jobs_filtering_search_term():
    q = Query()
    info = DummyInfo(DummyJobsUseCase(runs=SAMPLE_RUNS[:2]))
    res = await q.jobs(info, first=10, filter=JobFilter(search_term="a"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Alpha"


@pytest.mark.asyncio
async def test_jobs_filtering_project():
    q = Query()
    info = DummyInfo(DummyJobsUseCase(runs=SAMPLE_RUNS[:2]))
    res = await q.jobs(info, first=10, filter=JobFilter(project_id="proj2"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Beta"


@pytest.mark.asyncio
async def test_jobs_filtering_owner():
    q = Query()
    info = DummyInfo(DummyJobsUseCase(runs=SAMPLE_RUNS[:2]))
    res = await q.jobs(info, first=10, filter=JobFilter(owner="bob"))
    assert res.total_count == 1
    assert res.edges[0].node.display_label == "Alpha"


# ===========================================================================
# recent_job_runs resolver
# ===========================================================================


@pytest.mark.asyncio
async def test_recent_job_runs_returns_all_without_filter():
    """No filter: all runs returned, total_count matches full dataset."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(info, offset=0, limit=10)

    assert res.total_count == len(SAMPLE_RUNS)
    assert len(res.items) == len(SAMPLE_RUNS)


@pytest.mark.asyncio
async def test_recent_job_runs_pagination_offset_limit():
    """offset/limit slices the result correctly."""
    q = Query()
    info = DummyInfo()

    # First page
    res = await q.recent_job_runs(info, offset=0, limit=2)
    assert len(res.items) == 2
    assert res.total_count == len(SAMPLE_RUNS)

    # Second page
    res = await q.recent_job_runs(info, offset=2, limit=2)
    assert len(res.items) == 1  # only 3 runs total


@pytest.mark.asyncio
async def test_recent_job_runs_sorting_by_start_time_desc():
    """sort_by='start_time' DESC returns runs newest-first."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        sort_by="start_time", sort_order=SortOrder.DESC,
    )
    times = [item.start_time for item in res.items]
    assert times == sorted(times, reverse=True)


@pytest.mark.asyncio
async def test_recent_job_runs_sorting_by_start_time_asc():
    """sort_by='start_time' ASC returns runs oldest-first."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        sort_by="start_time", sort_order=SortOrder.ASC,
    )
    times = [item.start_time for item in res.items]
    assert times == sorted(times)


@pytest.mark.asyncio
async def test_recent_job_runs_filter_by_owner():
    """filter.owners narrows result to runs owned by the given owner."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        filter=JobRunFilter(owners=["alice"]),
    )
    assert res.total_count == 1
    assert res.items[0].job_id == "b"


@pytest.mark.asyncio
async def test_recent_job_runs_filter_by_status():
    """filter.statuses is case-insensitive and filters correctly."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        filter=JobRunFilter(statuses=["error"]),
    )
    assert res.total_count == 1
    assert res.items[0].job_id == "c"


@pytest.mark.asyncio
async def test_recent_job_runs_filter_by_type():
    """filter.types filters by job type (case-insensitive)."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        filter=JobRunFilter(types=["REQUEST-TYPE"]),
    )
    assert res.total_count == 1
    assert res.items[0].job_id == "b"


@pytest.mark.asyncio
async def test_recent_job_runs_filter_by_project():
    """filter.projects narrows to runs in proj1 (two runs)."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        filter=JobRunFilter(projects=["proj1"]),
    )
    assert res.total_count == 2
    job_ids = {item.job_id for item in res.items}
    assert job_ids == {"a", "c"}


@pytest.mark.asyncio
async def test_recent_job_runs_filter_by_issuer():
    """filter.issuers filters by issuer value (case-insensitive)."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=10,
        filter=JobRunFilter(issuers=["system"]),
    )
    assert res.total_count == 1
    assert res.items[0].job_id == "c"


@pytest.mark.asyncio
async def test_recent_job_runs_facets_populated():
    """Facets reflect all distinct values from the UNFILTERED full dataset."""
    q = Query()
    info = DummyInfo()
    res = await q.recent_job_runs(
        info, offset=0, limit=1,
        filter=JobRunFilter(statuses=["RUNNING"]),  # filter only 1, but facets use all
    )

    # total_count reflects filtered result
    assert res.total_count == 1

    # Facets must contain values from all 3 runs (unfiltered)
    assert "bob" in res.facets.owners
    assert "alice" in res.facets.owners
    assert "proj1" in res.facets.projects
    assert "proj2" in res.facets.projects
    assert "SELF-TYPE" in res.facets.types
    assert "REQUEST-TYPE" in res.facets.types


@pytest.mark.asyncio
async def test_recent_job_runs_refresh_forwarded_to_usecase():
    """refresh=True is forwarded to the UseCase.execute() call."""
    uc = DummyJobsUseCase(capture_calls=True)
    q = Query()
    info = DummyInfo(uc)

    await q.recent_job_runs(info, offset=0, limit=10, refresh=True)

    assert len(uc.calls) == 1
    assert uc.calls[0]["refresh"] is True


@pytest.mark.asyncio
async def test_recent_job_runs_no_refresh_by_default():
    """refresh defaults to False when not explicitly passed."""
    uc = DummyJobsUseCase(capture_calls=True)
    q = Query()
    info = DummyInfo(uc)

    await q.recent_job_runs(info, offset=0, limit=10)

    assert uc.calls[0]["refresh"] is False

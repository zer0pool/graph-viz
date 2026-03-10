import pytest
from app.domain.job_explorer.job_run_helpers import (
    calculate_facets_from_runs,
    apply_job_run_filters,
    sort_job_runs
)

@pytest.fixture
def sample_runs():
    return [
        {
            "job_id": "job1",
            "dag_id": "dag1",
            "project_id": "projA",
            "type": "SELF-TYPE",
            "issuer": "user1",
            "owners": ["owner1", "owner2"],
            "status": "Completed",
            "execution_time": "2025-01-01T00:00:00Z"
        },
        {
            "job_id": "job2",
            "dag_id": "dag2",
            "project_id": "projB",
            "type": "REQUEST-TYPE",
            "issuer": "System",
            "owners": ["owner3"],
            "status": "Error",
            "execution_time": "2025-01-02T00:00:00Z"
        },
        {
            "job_id": "job3",
            "dag_id": None,
            "project_id": None,
            "type": None,
            "issuer": None,
            "owners": [],
            "execution_time": "2025-01-03T00:00:00Z" # Missing status triggers seed logic
        }
    ]

def test_calculate_facets_from_runs(sample_runs):
    facets = calculate_facets_from_runs(sample_runs)
    assert "owner1" in facets["owners"]
    assert "owner3" in facets["owners"]
    assert "projA" in facets["projects"]
    assert "SELF-TYPE" in facets["types"]
    assert "user1" in facets["issuers"]
    assert "Completed" in facets["statuses"]
    assert "Error" in facets["statuses"]

def test_apply_job_run_filters(sample_runs):
    # Test job_id
    res = apply_job_run_filters(sample_runs, job_id="job1")
    assert len(res) == 1
    assert res[0]["job_id"] == "job1"

    # Test types
    res = apply_job_run_filters(sample_runs, types=["REQUEST-TYPE"])
    assert len(res) == 1
    assert res[0]["job_id"] == "job2"
    
    # Test owners
    res = apply_job_run_filters(sample_runs, owners=["owner3"])
    assert len(res) == 1
    assert res[0]["job_id"] == "job2"

    # Test projects
    res = apply_job_run_filters(sample_runs, projects=["proja"])
    assert len(res) == 1
    assert res[0]["job_id"] == "job1"
    
    # Test statuses
    res = apply_job_run_filters(sample_runs, statuses=["error"])
    assert len(res) == 1
    assert res[0]["job_id"] == "job2"
    
    # Test dag_id
    res = apply_job_run_filters(sample_runs, dag_id="dag1")
    assert len(res) == 1
    
    # Test issuers
    res = apply_job_run_filters(sample_runs, issuers=["system"])
    assert len(res) == 1

def test_sort_job_runs(sample_runs):
    res = sort_job_runs(sample_runs, sort_by="start_time", descending=True)
    assert res[0]["job_id"] == "job3"
    assert res[1]["job_id"] == "job2"
    assert res[2]["job_id"] == "job1"

    res = sort_job_runs(sample_runs, sort_by="start_time", descending=False)
    assert res[0]["job_id"] == "job1"
    assert res[1]["job_id"] == "job2"
    assert res[2]["job_id"] == "job3"

    # None sort_by
    res = sort_job_runs(sample_runs, sort_by=None)
    assert len(res) == 3

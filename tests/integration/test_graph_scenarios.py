
import pytest
import requests
import json
import time

BASE_URL = "http://localhost:5003/lineage-manager/api/v1/graph"

@pytest.fixture(scope="module", autouse=True)
def ensure_server():
    """Check if server is running before tests."""
    try:
        resp = requests.get(f"{BASE_URL}/health")
        resp.raise_for_status()
    except Exception as e:
        pytest.fail(f"Server is not running at {BASE_URL}. Start it with 'make run' first. Error: {e}")

def reset_db():
    requests.post(f"{BASE_URL}/reset").raise_for_status()
    # Give a tiny bit of time for async cache clearing/DB settle if any
    time.sleep(0.1)

def register_job(job_id, name, inputs=None, outputs=None):
    # Use the new /sync endpoint which takes the complete lineage payload
    payload = {
        "job_id": job_id,
        "type": "SELF",
        "name": name,
        "status": "RUNNING",
        "upstreams": [
            {
                "type": "table",
                "name": t,
                "storage": "bigquery",
                "dependency_type": "HARD"
            } for t in (inputs or [])
        ],
        "downstreams": [
            {
                "type": "table",
                "name": t,
                "storage": "bigquery",
                "write_mode": "APPEND"
            } for t in (outputs or [])
        ],
        "schedule": {
            "cron_expression": "@daily",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        },
        "governance": {"include_pii": False},
        "metadata": {
            "owner": "test-runner",
            "labels": {"env": "test"}
        }
    }
    resp = requests.post(f"{BASE_URL}/jobs/sync", json=payload)
    return resp

def test_scenario_01_sequential_chain():
    """Scenario 1: Sequential Chain (20 steps)"""
    reset_db()
    for i in range(1, 21):
        in_t = f"s1.t_{i-1:03d}" if i > 1 else "s1.start"
        out_t = f"s1.t_{i:03d}"
        register_job(f"S1_JOB_{i:03d}", f"S1 Job {i}", inputs=[in_t], outputs=[out_t]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/s1.t_010/neighbors?level=1&direction=both")
    data = resp.json()
    job_ids = {j["job_id"] for j in data["nodes"] if j["type"] == "job"}
    assert "S1_JOB_010" in job_ids
    assert "S1_JOB_011" in job_ids

def test_scenario_02_fan_hub():
    """Scenario 2: Fan-out/Fan-in Hub"""
    reset_db()
    ins = [f"s2.in_{i}" for i in range(5)]
    outs = [f"s2.out_{i}" for i in range(5)]
    register_job("S2_HUB", "S2 Hub", inputs=ins, outputs=outs).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/job/S2_HUB/neighbors?level=1")
    tables = [n for n in resp.json()["nodes"] if n["type"] == "table"]
    assert len(tables) == 10

def test_scenario_03_validation_empty():
    """Scenario 3: Validation (Empty Names)"""
    reset_db()
    # 1. Empty Job ID -> Should fail
    resp = register_job("", "Valid Name")
    assert resp.status_code == 400 or resp.status_code == 500 # Depending on how error is caught
    
    # 2. Empty Job Name -> Should fail
    resp = register_job("J_VALID", "")
    assert resp.status_code == 400 or resp.status_code == 500
    
    # 3. Empty Table Name -> Should be skipped
    register_job("J_EMPTY_TBL", "J Empty Tbl", inputs=["valid_in", "", " "], outputs=["valid_out"]).raise_for_status()
    resp = requests.get(f"{BASE_URL}/job/J_EMPTY_TBL/neighbors?level=1")
    data = resp.json()
    tables = {n["full_name"] for n in data["nodes"] if n["type"] == "table"}
    assert "" not in tables
    assert " " not in tables
    assert "valid_in" in tables

def test_scenario_04_diamond():
    """Scenario 4: Diamond Pattern (T1 -> J1 -> (T2, T3) -> J2 -> T4)"""
    reset_db()
    register_job("J1", "J1", inputs=["T1"], outputs=["T2", "T3"]).raise_for_status()
    register_job("J2", "J2", inputs=["T2", "T3"], outputs=["T4"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=4&direction=downstream")
    data = resp.json()
    table_names = {n["full_name"] for n in data["nodes"] if n["type"] == "table"}
    assert {"T1", "T2", "T3", "T4"}.issubset(table_names)

def test_scenario_05_multi_producer():
    """Scenario 5: Multi-Producer Table (J1 -> T1, J2 -> T1)"""
    reset_db()
    register_job("J1", "J1", inputs=["IN1"], outputs=["T1"]).raise_for_status()
    register_job("J2", "J2", inputs=["IN2"], outputs=["T1"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=1&direction=upstream")
    job_ids = {j["job_id"] for j in resp.json()["nodes"] if j["type"] == "job"}
    assert "J1" in job_ids
    assert "J2" in job_ids

def test_scenario_06_disconnected():
    """Scenario 6: Disconnected Islands"""
    reset_db()
    register_job("A1", "A1", inputs=["TA1"], outputs=["TA2"]).raise_for_status()
    register_job("B1", "B1", inputs=["TB1"], outputs=["TB2"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/TA1/neighbors?level=10&direction=both")
    nodes = {n.get("full_name") or n.get("job_id") for n in resp.json()["nodes"]}
    assert "TA2" in nodes
    assert "TB1" not in nodes

def test_scenario_07_self_loop():
    """Scenario 7: Simple Cycle (Self-loop) J1: T1 -> T1"""
    reset_db()
    register_job("J_LOOP", "J Loop", inputs=["T1"], outputs=["T1"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=10&direction=both")
    data = resp.json()
    # Traversal should handle this and not hang or duplicate T1 in strange ways
    table_nodes = [n for n in data["nodes"] if n["type"] == "table" and n["full_name"] == "T1"]
    assert len(table_nodes) == 1

def test_scenario_08_multi_job_cycle():
    """Scenario 8: Multi-Job Cycle (J1: T1 -> T2, J2: T2 -> T1)"""
    reset_db()
    register_job("J1", "J1", inputs=["T1"], outputs=["T2"]).raise_for_status()
    register_job("J2", "J2", inputs=["T2"], outputs=["T1"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=5&direction=both")
    data = resp.json()
    job_ids = {j["job_id"] for j in data["nodes"] if j["type"] == "job"}
    assert "J1" in job_ids
    assert "J2" in job_ids

def test_scenario_09_branching():
    """Scenario 9: Daisy Chain with Branching"""
    reset_db()
    register_job("J1", "J1", inputs=["T1"], outputs=["T2"]).raise_for_status()
    register_job("J2", "J2", inputs=["T2"], outputs=["T3"]).raise_for_status()
    register_job("J3", "J3", inputs=["T2"], outputs=["T4"]).raise_for_status()
    
    resp = requests.get(f"{BASE_URL}/table/T2/neighbors?level=1&direction=downstream")
    job_ids = {j["job_id"] for j in resp.json()["nodes"] if j["type"] == "job"}
    assert "J2" in job_ids
    assert "J3" in job_ids

def test_scenario_10_m2m_bridge():
    """Scenario 10: Many-to-Many Bridge ((T1, T2) -> J1 -> (T3, T4) -> J2 -> (T5, T6))"""
    reset_db()
    register_job("J1", "J1", inputs=["T1", "T2"], outputs=["T3", "T4"]).raise_for_status()
    register_job("J2", "J2", inputs=["T3", "T4"], outputs=["T5", "T6"]).raise_for_status()
    
    # level 4 should be enough, but let's use level 5 to ensure we capture the leaves clearly
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=5&direction=downstream")
    data = resp.json()
    names = {n.get("full_name") or n.get("job_id") for n in data["nodes"]}
    
    # Must contain everything downstream from T1
    assert "T3" in names
    assert "T4" in names
    assert "J1" in names
    assert "J2" in names
    assert "T5" in names
    assert "T6" in names

def get_health():
    return requests.get(f"{BASE_URL}/health").json()

def test_scenario_11_ordering_independence():
    """Scenario 11: Ordering Independence. Final state should be same regardless of insertion order."""
    
    jobs = [
        {"id": "J1", "in": ["T0"], "out": ["T1"]},
        {"id": "J2", "in": ["T1"], "out": ["T2"]},
        {"id": "J3", "in": ["T2"], "out": ["T3"]},
    ]
    
    # Order A: 1, 2, 3
    reset_db()
    for j in jobs:
        register_job(j["id"], j["id"], inputs=j["in"], outputs=j["out"]).raise_for_status()
    stats_a = get_health()["database"]
    
    # Order B: 3, 2, 1 (Reverse)
    reset_db()
    for j in reversed(jobs):
        register_job(j["id"], j["id"], inputs=j["in"], outputs=j["out"]).raise_for_status()
    stats_b = get_health()["database"]
    
    # Closure and edge counts must be identical
    assert stats_a["edge_count"] == stats_b["edge_count"]
    assert stats_a["closure_count"] == stats_b["closure_count"]
    assert stats_a["table_count"] == stats_b["table_count"]

def test_scenario_12_lineage_metrics_consistency():
    """Scenario 12: Verify if /table/{name}/neighbors handles level correctly for deep trees."""
    reset_db()
    # T1 -> J1 -> T2 -> J2 -> T3 -> J3 -> T4 -> J4 -> T5
    for i in range(1, 5):
        register_job(f"JOB_{i}", f"JOB_{i}", inputs=[f"T{i}"], outputs=[f"T{i+1}"]).raise_for_status()
        
    # level=2 from T1 -> J1, T2
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=2&direction=downstream").json()
    names = {n.get("full_name") or n.get("job_id") for n in resp["nodes"]}
    assert "T2" in names
    assert "T3" not in names
    
    # level=4 from T1 -> J1(1), T2(2), J2(3), T3(4)
    resp = requests.get(f"{BASE_URL}/table/T1/neighbors?level=4&direction=downstream").json()
    names = {n.get("full_name") or n.get("job_id") for n in resp["nodes"]}
    assert "T3" in names
    # T4 is level 6. It MUST NOT be here.
    assert "T4" not in names
    assert "JOB_3" not in names

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

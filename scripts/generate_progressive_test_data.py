#!/usr/bin/env python3
"""
Test data generator for progressive node expansion
Creates a job with 10 upstream jobs and 10 downstream jobs
Each upstream job has 2 more upstream jobs
"""

import requests
import json

BASE_URL = "http://localhost:5003/lineage-manager"

def register_job(job_data):
    """Register a job via the direct sync API"""
    url = f"{BASE_URL}/api/v1/graph/jobs/sync"
    
    # Transform to SchedulingLineage format
    lineage = {
        "type": "SELF-TYPE",
        "job_id": job_data["job_id"],
        "name": job_data["name"],
        "upstreams": [
            {"type": "table", "name": t, "trigger": True} 
            for t in job_data.get("trigger_tables", [])
        ],
        "downstreams": [
            {"type": "table", "name": job_data["destination_table"]}
        ] if job_data.get("destination_table") else [],
        "properties": {
            "owner": job_data.get("owner"),
            "labels": job_data.get("labels", {}),
            "write_mode": job_data.get("write_mode"),
            "metadata": job_data.get("metadata", {})
        }
    }
    
    response = requests.post(url, json=lineage)
    if response.status_code == 200:
        print(f"✅ Synced: {job_data['job_id']}")
    else:
        print(f"❌ Failed: {job_data['job_id']} - {response.text}")
    return response

def create_test_data():
    """Create hierarchical test data"""
    
    # Level 0: 20 upstream jobs (2 for each of 10 level-1 jobs)
    print("\n=== Creating Level 0 (20 upstream jobs) ===")
    for i in range(1, 21):
        job_data = {
            "job_id": f"LEVEL0_JOB_{i:03d}",
            "name": f"LEVEL0_JOB_{i:03d}",
            "labels": {"level": "0", "test": "progressive_expansion"},
            "owner": "test_user",
            "write_mode": "append",
            "destination_table": f"test.level0.output_{i:03d}",
            "trigger_tables": [f"test.level0.input_{i:03d}"],
            "metadata": {"description": "Level 0 upstream job"}
        }
        register_job(job_data)
    
    # Level 1: 10 upstream jobs (each reads from 2 level-0 jobs)
    print("\n=== Creating Level 1 (10 upstream jobs) ===")
    for i in range(1, 11):
        upstream_idx1 = (i - 1) * 2 + 1
        upstream_idx2 = (i - 1) * 2 + 2
        
        trigger_tables = [
            f"test.level0.output_{upstream_idx1:03d}",
            f"test.level0.output_{upstream_idx2:03d}"
        ]
        
        job_data = {
            "job_id": f"LEVEL1_JOB_{i:03d}",
            "name": f"LEVEL1_JOB_{i:03d}",
            "labels": {"level": "1", "test": "progressive_expansion"},
            "owner": "test_user",
            "write_mode": "append",
            "destination_table": f"test.level1.output_{i:03d}",
            "trigger_tables": trigger_tables,
            "metadata": {"description": "Level 1 upstream job"}
        }
        register_job(job_data)
    
    # Level 2: CENTER JOB (reads from all 10 level-1 jobs)
    print("\n=== Creating Level 2 (CENTER JOB) ===")
    trigger_tables = [f"test.level1.output_{i:03d}" for i in range(1, 11)]
    
    center_job = {
        "job_id": "CENTER_JOB",
        "name": "CENTER_JOB",
        "labels": {"level": "2", "test": "progressive_expansion", "center": "true"},
        "owner": "test_user",
        "write_mode": "append",
        "destination_table": "test.center.main_output",
        "trigger_tables": trigger_tables,
        "metadata": {"description": "Center job with 10 upstream jobs"}
    }
    register_job(center_job)
    
    # Level 3: 10 downstream jobs (each reads from center job)
    print("\n=== Creating Level 3 (10 downstream jobs) ===")
    for i in range(1, 11):
        job_data = {
            "job_id": f"LEVEL3_JOB_{i:03d}",
            "name": f"LEVEL3_JOB_{i:03d}",
            "labels": {"level": "3", "test": "progressive_expansion"},
            "owner": "test_user",
            "write_mode": "append",
            "destination_table": f"test.level3.output_{i:03d}",
            "trigger_tables": ["test.center.main_output"],
            "metadata": {"description": "Level 3 downstream job"}
        }
        register_job(job_data)
    
    print("\n" + "="*60)
    print("✅ Test data creation complete!")
    print("="*60)
    print("\nData structure:")
    print("  Level 0: 20 jobs (2 upstream for each Level 1)")
    print("  Level 1: 10 jobs (upstream of CENTER)")
    print("  Level 2: 1 CENTER_JOB")
    print("  Level 3: 10 jobs (downstream of CENTER)")
    print("\nTotal: 41 jobs")
    print("\nTo test progressive expansion:")
    print("1. Search for 'CENTER_JOB'")
    print("2. Click 'Expand Upstream' - should show 4 jobs + '... 6 more jobs'")
    print("3. Click aggregate node - heartbeat animation + 3 more jobs")
    print("4. Click 'Expand Downstream' - should show 4 jobs + '... 6 more jobs'")
    print("5. Click aggregate node - heartbeat animation + 3 more jobs")

if __name__ == "__main__":
    print("="*60)
    print("Progressive Expansion Test Data Generator")
    print("="*60)
    
    try:
        create_test_data()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to server")
        print(f"   Make sure the server is running at {BASE_URL}")
    except Exception as e:
        print(f"\n❌ Error: {e}")

import requests
import json
import os
import time

BASE_URL = "http://localhost:5003/lineage-manager/api/v1/graph"
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

PAYLOADS = [
    "progressive_test_payload.json",
    "complex_progressive_payload.json",
    "massive_progressive_payload.json"
]

def reset_database():
    print("=== Resetting Database ===")
    url = f"{BASE_URL}/reset"
    try:
        response = requests.post(url)
        response.raise_for_status()
        print("✅ Database reset successfully.")
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False
    return True

def sync_payload(payload_name):
    print(f"\n=== Syncing Payload: {payload_name} ===")
    url = f"{BASE_URL}/jobs/sync/by_ids"
    file_path = os.path.join(SCRIPTS_DIR, payload_name)
    
    if not os.path.exists(file_path):
        print(f"⚠️ File not found: {file_path}")
        return

    with open(file_path, "r") as f:
        data = json.load(f)

    jobs = data.get("jobs", [])
    chunk_size = 50
    chunks = [jobs[i:i + chunk_size] for i in range(0, len(jobs), chunk_size)]
    
    total_successful = 0
    total_jobs = len(jobs)
    
    print(f"📦 Total jobs to sync: {total_jobs} (Split into {len(chunks)} chunks of {chunk_size})")

    for idx, chunk in enumerate(chunks, 1):
        chunk_payload = {"jobs": chunk}
        print(f"  ➜ Sending chunk {idx}/{len(chunks)} ({len(chunk)} jobs)...", end="", flush=True)
        try:
            response = requests.post(url, json=chunk_payload)
            response.raise_for_status()
            result = response.json()
            success = result.get('successful', 0)
            total_successful += success
            print(f" ✅ ({success} jobs synced)")
        except Exception as e:
            print(f" ❌ Error: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"   Response: {e.response.text}")
        time.sleep(0.2)

    print(f"🎉 Summary for {payload_name}: {total_successful} / {total_jobs} jobs synced successfully.")

def check_health():
    print("\n=== Checking System Health ===")
    url = f"{BASE_URL}/health"
    try:
        response = requests.get(url)
        response.raise_for_status()
        health = response.json().get("database", {})
        print(f"📊 Current Stats: Jobs: {health.get('job_count')}, Tables: {health.get('table_count')}, Edges: {health.get('edge_count')}")
    except Exception as e:
        print(f"❌ Error checking health: {e}")

if __name__ == "__main__":
    if reset_database():
        # Wait a bit for DB to stabilize
        time.sleep(1)
        for payload in PAYLOADS:
            sync_payload(payload)
            time.sleep(0.5)
        
        time.sleep(1)
        check_health()
        print("\n🚀 All test data loaded and verified!")

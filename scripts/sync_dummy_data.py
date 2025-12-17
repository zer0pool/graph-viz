#!/usr/bin/env python3
import requests
import sys

DUMMY_URL = "http://localhost:9000/api/v1/jobs/scheduling-lineage/progressive_test"
SYNC_URL = "http://localhost:5003/api/v1/sync/sync"

def main():
    # 1. Fetch data from Dummy
    print(f"Fetching data from {DUMMY_URL}...")
    try:
        resp = requests.post(DUMMY_URL, json={"jobs": []}) # Empty list triggers 'return_all'
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching from dummy: {e}")
        sys.exit(1)
        
    jobs = data.get("result", [])
    print(f"Got {len(jobs)} jobs from dummy.")
    
    if not jobs:
        print("No jobs returned. Check dummy manager implementation.")
        sys.exit(1)

    # 2. Push to Lineage Manager Sync
    print(f"Syncing to {SYNC_URL}...")
    try:
        # Construct payload for sync. According to GraphSyncService.sync_from_payload, it expects {"jobs": [...]}
        sync_payload = {"jobs": jobs, "reset": False}
        
        resp = requests.post(SYNC_URL, json=sync_payload)
        resp.raise_for_status()
        result = resp.json()
        print(f"Sync successful: {result}")
    except Exception as e:
        print(f"Error syncing to lineage manager: {e}")
        if hasattr(e, 'response') and e.response:
             print(f"Response: {e.response.text}")
        sys.exit(1)

if __name__ == "__main__":
    main()

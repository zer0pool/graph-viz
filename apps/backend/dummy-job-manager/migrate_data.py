
import json
import os
from datetime import datetime, timedelta, timezone

# Ensure output directories exist
os.makedirs("app/data/lineage", exist_ok=True)
os.makedirs("app/data/run-history", exist_ok=True)

# 1. Migrate Lineage Data
try:
    if os.path.exists("dummy_lineage.json"):
        with open("dummy_lineage.json", "r") as f:
            data = json.load(f)
            items = data.get("items", [])
            print(f"Loaded {len(items)} items from dummy_lineage.json")

            self_type_items = [i for i in items if i.get("type") == "SELF-TYPE"]
            request_type_items = [i for i in items if i.get("type") == "REQUEST-TYPE"]

            # Save SELF-TYPE.json
            with open("app/data/lineage/SELF-TYPE.json", "w") as out:
                json.dump({"items": self_type_items}, out, indent=2)
            print(f"Saved {len(self_type_items)} items to app/data/lineage/SELF-TYPE.json")

            # Save REQUEST-TYPE.json
            with open("app/data/lineage/REQUEST-TYPE.json", "w") as out:
                json.dump({"items": request_type_items}, out, indent=2)
            print(f"Saved {len(request_type_items)} items to app/data/lineage/REQUEST-TYPE.json")
            
            # Save default.json (using REQUEST-TYPE as default if logic dictates, or just empty)
            # Actually, standard practice for default might be empty or combined. 
            # Given the code filtered by type, let's just leave default as empty structure for now or copy one.
            # But the user said "read mapping response file".
    else:
        print("dummy_lineage.json not found. Skipping lineage migration.")
except Exception as e:
    print(f"Error migrating lineage data: {e}")

# 2. Generate Default Run History
def generate_run_history():
    job_id = "default_job"
    base_end = datetime(2025, 12, 3, 1, 0, tzinfo=timezone.utc)
    runs = []
    for idx in range(30):
        end_at = base_end - timedelta(days=idx)
        start_at = end_at + timedelta(hours=-72 + (idx % 6))
        state = ["RUNNING", "SUCCESS", "FAILED", "SUCCESS", "SUCCESS", "FAILED"][idx % 6]
        finish_time = None if state == "RUNNING" else start_at + timedelta(minutes=30 + idx)
        runs.append(
            {
                "job_id": job_id,
                "data_interval_end": end_at.strftime("%Y-%m-%dT%H:%M:%S"),
                "dag_run_id": f"scheduled__{(end_at - timedelta(days=1)).isoformat()}",
                "state": state,
                "start_time": start_at.strftime("%Y-%m-%dT%H:%M:%S"),
                "finish_time": finish_time.strftime("%Y-%m-%dT%H:%M:%S") if finish_time else None,
                "delay_criteria": [],
                "notified": False if state != "RUNNING" else None,
            }
        )
    return runs

with open("app/data/run-history/default.json", "w") as f:
    json.dump(generate_run_history(), f, indent=2)
print("Saved app/data/run-history/default.json")

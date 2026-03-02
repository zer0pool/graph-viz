import json
import csv
import os
from datetime import datetime, timedelta, timezone

# Today is 2026-03-02
END_DATE = datetime(2026, 5, 31, 0, 0, 0, tzinfo=timezone.utc)
START_DATE = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

DATA_FILES = [
    "/home/darkwing/src/lineage_platform/apps/backend/dummy-job-manager/app/data/lineage/REQUEST-TYPE.json",
    "/home/darkwing/src/lineage_platform/apps/backend/dummy-job-manager/app/data/lineage/SELF-TYPE.json"
]

OUTPUT_FILE = "/tmp/job_run_history.csv"

def get_runs(job, start_date, end_date):
    job_id = job.get("job_id")
    metadata = job.get("metadata", {})
    job_meta = metadata.get("job_meta", {})
    schedule = job_meta.get("schedule", {})
    interval = schedule.get("interval", "@daily")
    
    # Extract dag_id from project name
    dag_id = metadata.get("project_name") or metadata.get("project", "default-dag")
    
    # Extract destination
    downstreams = job.get("downstreams", [])
    destination = downstreams[0].get("name", "unknown") if downstreams else "unknown"
    
    # Extract issuer
    owners = metadata.get("owner", [])
    issuer = owners[0] if owners else "system"
    
    cron_schedule = interval
    
    delta = None
    if interval == "@hourly":
        delta = timedelta(hours=1)
    elif interval == "@daily":
        delta = timedelta(days=1)
    elif interval == "@weekly":
        delta = timedelta(weeks=1)
    elif interval == "@continuous":
        delta = timedelta(minutes=10)
    else:
        delta = timedelta(days=1) # Default to daily if unknown
        
    runs = []
    current_time = start_date
    
    while current_time < end_date:
        start_time = current_time
        next_start_time = start_time + delta
        publish_time = start_time + timedelta(seconds=10)
        
        date_str = start_time.strftime("%Y-%m-%d")
        hour_str = start_time.strftime("%H")
        period_str = f"{date_str} {hour_str}"
        
        runs.append({
            "dag_id": dag_id,
            "job_id": job_id,
            "destination": destination,
            "issuer": issuer,
            "cron_schedule": cron_schedule,
            "period": period_str,
            "date": date_str,
            "hour": hour_str,
            "start_time": start_time.isoformat(),
            "next_start_time": next_start_time.isoformat(),
            "publish_time": publish_time.isoformat()
        })
        
        current_time += delta
        
    return runs

def main():
    all_runs = []
    
    for file_path in DATA_FILES:
        with open(file_path, 'r') as f:
            data = json.load(f)
            items = data.get("items", [])
            for item in items:
                runs = get_runs(item, START_DATE, END_DATE)
                all_runs.extend(runs)
                
    keys = ["dag_id", "job_id", "destination", "issuer", "cron_schedule", "period", "date", "hour", "start_time", "next_start_time", "publish_time"]
    
    with open(OUTPUT_FILE, 'w', newline='') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(all_runs)
        
    print(f"Generated {len(all_runs)} runs in {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

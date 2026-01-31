import strawberry
from typing import List
from datetime import datetime, timedelta
import random

from app.domain.ingestion.client import JobManagerClient
# from app.core.config import settings

async def resolve_job_runs(job_id: str, limit: int = 5) -> List["JobRun"]: # type: ignore
    from app.graphql.types import JobRun
    
    # Use the existing client. 
    # In a real app, use dependency injection or a singleton client per request.
    client = JobManagerClient() 
    try:
        # We might need a specific method for runs in client, currently using 'fetch_lineages' logic style
        # Or raw request
        # Assuming V1 endpoint: GET /api/job/job-run-history/?job_id=...
        
        # Stubbing for now if API isn't actually reachable during this build phase, 
        # but connecting to client logic:
        # history = await client.get_job_run_history(job_id) 
        
        # MOCK IMPLEMENTATION for demonstration until V1 is live alongside V2
        return [
            JobRun(
                run_id=f"run_{job_id}_{i}",
                job_id=job_id,
                status=random.choice(["SUCCESS", "FAILURE", "RUNNING"]),
                start_time=datetime.utcnow() - timedelta(hours=i),
                end_time=datetime.utcnow() - timedelta(hours=i) + timedelta(minutes=random.randint(5, 60)),
                duration_ms=random.randint(1000, 50000)
            )
            for i in range(limit)
        ]
    finally:
        await client.close()

async def resolve_table_history(table_name: str, days: int = 7) -> List["TableHistory"]: # type: ignore
    from app.graphql.types import TableHistory
    
    # This would call BigQuery
    # MOCK
    return [
        TableHistory(
            date=(datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"),
            row_count=random.randint(1000, 1000000),
            size_bytes=random.randint(1024*1024, 1024*1024*1024)
        )
        for i in range(days)
    ]

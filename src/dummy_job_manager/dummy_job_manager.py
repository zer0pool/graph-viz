from fastapi import FastAPI, Query
from typing import Optional

app = FastAPI(title="Connected DAG Dummy Job Manager (200 items)")


# =====================================================================
# Helper: Create Lineage Object
# =====================================================================
def build_lineage(job, lineage_type):
    """Convert internal job descriptor → scheduling-lineage JSON."""
    upstreams = []
    for src in job["reads"]:
        if src.startswith("s3://"):
            upstreams.append({"type": "s3", "name": src, "trigger": False})
        else:
            upstreams.append({"type": "table", "name": src, "trigger": True})

    downstream_table = job["writes"][0]

    return {
        "type": lineage_type,
        "job_id": job["job_id"],
        "name": job["job_id"],
        "upstreams": upstreams,
        "downstreams": [{"type": "table", "name": downstream_table}],
        "destination_type": "table",
        "schedule": {"cron": "@daily"},
        "meta": {
            "owner": "tester",
            "labels": {"env": "test"},
            "write_mode": "append",
            "run_status": "RUN",
        },
        "create_datetime": "2024-12-01T02:00:00Z",
        "update_datetime": "2024-12-01T03:15:00Z",
        "successful_dag_runs_count": 10,
    }


# =====================================================================
# STEP 1: Source tables (1/4 of total tables)
# =====================================================================
SOURCE_TABLE_COUNT = 50
SOURCE_TABLES = [
    f"demo.analytics.SRC_TABLE_{i:03d}" for i in range(1, SOURCE_TABLE_COUNT + 1)
]


# =====================================================================
# STEP 2: Layer 1 Jobs (50 jobs) reading directly from source tables
# =====================================================================
L1 = []
for i in range(1, 51):
    src_table = SOURCE_TABLES[(i - 1) % SOURCE_TABLE_COUNT]
    job = {
        "job_id": f"L1_JOB_{i:03d}",
        "reads": [src_table],
        "writes": [f"demo.analytics.L1_OUT_{i:03d}"],
    }
    L1.append(job)


# =====================================================================
# STEP 3: Layer 2 Jobs (25 jobs) reading from L1 outputs
# =====================================================================
L2 = []
for i in range(1, 26):
    parent_out = L1[(i - 1) % 50]["writes"][0]
    job = {
        "job_id": f"L2_JOB_{i:03d}",
        "reads": [parent_out],
        "writes": [f"demo.analytics.L2_OUT_{i:03d}"],
    }
    L2.append(job)


# =====================================================================
# STEP 4: Layer 3 Jobs (25 jobs) reading from previous tables
# =====================================================================
L3 = []
for i in range(1, 26):
    src_table = SOURCE_TABLES[(i - 1) % 50]
    l1_out = L1[(i - 1) % 50]["writes"][0]
    job = {
        "job_id": f"L3_JOB_{i:03d}",
        "reads": [src_table, l1_out],
        "writes": [f"demo.analytics.L3_OUT_{i:03d}"],
    }
    L3.append(job)


# =====================================================================
# STEP 5: Layer 4 Jobs (25 jobs) reading from L2 + S3
# =====================================================================
L4 = []
for i in range(1, 26):
    l2_out = L2[(i - 1) % 25]["writes"][0]
    s3_path = f"s3://dummy-bucket/layer4/{i}"
    job = {
        "job_id": f"L4_JOB_{i:03d}",
        "reads": [l2_out, s3_path],
        "writes": [f"demo.analytics.L4_OUT_{i:03d}"],
    }
    L4.append(job)


# =====================================================================
# STEP 6: Layer 5 Jobs (25 jobs) multi-source (SOURCE + L1 + L2 + L3 + S3)
# =====================================================================
L5 = []
for i in range(1, 26):
    reads = [
        SOURCE_TABLES[(i - 1) % 50],
        L1[(i - 1) % 50]["writes"][0],
        L2[(i - 1) % 25]["writes"][0],
        L3[(i - 1) % 25]["writes"][0],
        f"s3://dummy-bucket/multi/{i}",
    ]
    job = {
        "job_id": f"L5_JOB_{i:03d}",
        "reads": reads,
        "writes": [f"demo.analytics.L5_OUT_{i:03d}"],
    }
    L5.append(job)


# =====================================================================
# Combine Jobs → 200 total
# =====================================================================
ALL_JOBS = L1 + L2 + L3 + L4 + L5  # 50 + 25 + 25 + 25 + 25 = 150 jobs
# But we need 200: so replicate L1 and L2 to reach 200
while len(ALL_JOBS) < 200:
    ALL_JOBS.append(
        {
            "job_id": f"EXTRA_JOB_{len(ALL_JOBS)+1:03d}",
            "reads": [SOURCE_TABLES[(len(ALL_JOBS) % 50)]],
            "writes": [f"demo.analytics.EXTRA_OUT_{len(ALL_JOBS)+1:03d}"],
        }
    )


# Check final count
assert len(ALL_JOBS) == 200


# =====================================================================
# Assign SELF-TYPE and REQUEST-TYPE (100 each)
# =====================================================================
SELF_JOBS = ALL_JOBS[:100]
REQUEST_JOBS = ALL_JOBS[100:200]

SELF_DATA = [build_lineage(job, "SELF-TYPE") for job in SELF_JOBS]
REQ_DATA = [build_lineage(job, "REQUEST-TYPE") for job in REQUEST_JOBS]

ALL_DATA = SELF_DATA + REQ_DATA  # 200 final entries


# =====================================================================
# API Endpoint
# =====================================================================
@app.get("/api/v1/jobs/scheduling-lineage/")
def get_scheduling_lineage(
    scheduling_type: Optional[str] = Query(default=None),
    offset: int = 0,
    limit: int = 100,
):
    """Paginated deterministic lineage data."""

    if scheduling_type == "SELF-TYPE":
        filtered = SELF_DATA
    elif scheduling_type == "REQUEST-TYPE":
        filtered = REQ_DATA
    else:
        filtered = ALL_DATA

    total = len(filtered)
    end = offset + limit
    page = filtered[offset:end]
    next_offset = end if end < total else None

    return {
        "status": "success",
        "result": page,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "next_offset": next_offset,
            "total": total,
        },
    }

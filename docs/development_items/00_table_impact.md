Title: Table Impact API

Summary
- Implements GET `/api/v1/tables/{table_name}/impact` to list downstream tables impacted by a base table, grouped by depth, with optional writer jobs.

Endpoint
- `GET /api/v1/tables/{table_name}/impact`
- Query params:
  - `max_depth` (int, default 3, 1–10)
  - `include_jobs` (bool, default true)

Response Example
```
{
  "base_table": "sales_daily",
  "downstream": [
    {"depth": 1, "table": "sales_summary", "writer_jobs": ["job_sales_summary_agg"], "description": "sales_daily → sales_summary 영향 depth=1"},
    {"depth": 2, "table": "sales_report",  "writer_jobs": ["job_sales_report_publish"], "description": "sales_daily → sales_report 영향 depth=2"}
  ],
  "summary": {"total_depth": 2, "total_downstream_tables": 2, "total_writer_jobs": 2}
}
```

Implementation
- Router: `src/graph_manager/api/v1/endpoints/tables.py`
- Service: `GraphService.get_table_impact` (BFS over job-table links)
- Repository helpers: `TableRepository.get_by_full_name`

Seeding & Testing
1) Start API (`uvicorn graph_manager.main:app --reload`)
2) Seed test data:
   - `bash scripts/load_test_jobs.sh`
3) Query impact:
   - `curl "http://localhost:8000/api/v1/tables/TABLE_01/impact?max_depth=3&include_jobs=true"`

Notes
- Writer jobs for each downstream table are the jobs that output to that table.
- If `include_jobs=false`, the `writer_jobs` arrays are omitted.


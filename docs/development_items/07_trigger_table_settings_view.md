Title: Trigger Table Settings – View (07)

Summary
- Adds an API to retrieve trigger ON/OFF status for every job that consumes a given table.
- UI renders a Trigger Tables panel with one switch per consumer job.
- Requires fully‑qualified BigQuery table names (project.dataset.table) for APIs.

APIs
- GET `/api/v1/tables/{full_name}/triggers`
  - Path param `full_name`: BigQuery fully‑qualified table name.
  - Response:
    {
      "status": "success",
      "table": "project.dataset.table",
      "count": 3,
      "jobs": [
        {"job_id": "JOB_A", "name": "JOB_A", "trigger": true},
        {"job_id": "JOB_B", "name": "JOB_B", "trigger": false}
      ]
    }

Implementation Notes
- Endpoint: `src/graph_manager/api/v1/endpoints/tables.py#get_table_triggers()`
- Service: `GraphQueryService.get_table_triggers()` delegates to `GraphService.get_table_triggers()`.
- Storage model: `GraphJobNode.trigger_tables` (JSON list) indicates which input tables are triggering for that job; an edge mirror flag `graph_edge.is_trigger_on` is also updated for readability.

Frontend
- Location: `src/graph_manager/static/js/main.js`
- When a table node is selected, a Trigger Tables panel appears listing each consumer job with a slider switch.
- “All OFF” pill button is shown on the same row as the panel title and is disabled when all jobs are already OFF.

Validation / Testing
- Seed test graph: `bash scripts/load_test_jobs.sh` (requires app running at `BASE_URL=http://localhost:8000`).
- View status: `curl -s "http://localhost:8000/api/v1/tables/demo.analytics.TABLE_06/triggers" | jq`.

Known Constraints
- Only visible when a table node is in focus in the UI.
- SSE only updates visible switches for the open table.


Title: Graph Sync API

Summary
- Adds endpoints to synchronize the graph from an external source (Job Manager) or from a posted payload of jobs.

Endpoints
- POST `/api/v1/graph/sync`
  - Body options (JSON, one of):
    - `{ "source": "job_manager", "reset": true }` → fetch via adapter and rebuild
    - `{ "jobs": [ JobRegister... ], "reset": false }` → upsert from payload
  - Returns: status, counts, and DB stats
- GET `/api/v1/graph/sync/status`
  - Returns last sync status during process lifetime (non-persistent)

Notes
- `reset: true` clears existing graph (tables/edges/links/jobs) before syncing.
- Job payloads use the same schema as `JobRegister` used by `/api/v1/graph/jobs`.

Implementation
- Build service extended:
  - `GraphBuildService.sync_from_payload(jobs, reset)`
  - `GraphBuildService.sync_from_job_manager(reset)`
  - `GraphBuildService.last_sync_status()`
- Endpoints: `src/graph_manager/api/v1/endpoints/sync.py`
- Wiring: `src/graph_manager/main.py`


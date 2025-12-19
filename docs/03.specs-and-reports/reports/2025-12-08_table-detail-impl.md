---
status: draft
owner: huey
created: 2025-12-08
updated: 2025-12-08
version: 0.1
related: [2025-12-08_table-job-detail-panel]
tags: [frontend, backend, table-detail]
---

Created: 2025-12-08
Updated: 2025-12-08
Author: Data Platform Team
Version: 0.1
Status: Draft
Title: Implementation Notes — Table Detail Panel (Backend + Frontend)

Summary:
Implemented backend endpoints returning dummy BigQuery-like data and wired frontend panel to consume them with lazy-loading per tab.

What I changed
- Backend (FastAPI):
  - `src/lineage_manager/api/v1/endpoints/tables.py`
    - Added `GET /api/v1/tables/{table_name}/schema` returning fixed schema for `gizmopool.austin_bikeshare.bikeshare_stations` regardless of requested path.
    - Added `GET /api/v1/tables/{table_name}/detail` returning fixed table metadata for the same test table.
- Frontend (Vanilla JS):
  - `src/lineage_manager/static/js/app/services/api.js`
    - Added `fetchTableDetail(tableName)` and `fetchTableSchema(tableName)` to call the new endpoints.
  - `src/lineage_manager/static/js/app/ui/panelControllerNew.js`
    - After the panel immediately renders node-derived metadata, it now requests `/detail` and updates the table view when the authoritative payload arrives.
    - Lazy-loads schema when the Schema tab is opened and populates the table schema.
- Documentation:
  - This short implementation report (this file).

Notes / Next steps
- The backend endpoints currently return static/dummy data for `gizmopool.austin_bikeshare.bikeshare_stations` as requested. When ready to integrate with BigQuery, replace the placeholder logic in `tables.py` with real BigQuery API calls.
- Recommended manual test steps (from project root):

```bash
# (1) Activate venv and run app
source .venv/bin/activate
uvicorn --app-dir src lineage_manager.main:app --reload --port 8000

# (2) Quick API checks
curl -sS http://localhost:8000/lineage-manager/api/v1/tables/anything/schema | jq
curl -sS http://localhost:8000/lineage-manager/api/v1/tables/anything/detail | jq
```

- Frontend behaviour:
  - Overview tab: shows node-derived metadata immediately, then is replaced by authoritative backend detail when fetched.
  - Schema tab: fetches `/schema` when the tab is first opened and renders column rows.
  - Lineage and Activity tabs: existing logic remains; Activity uses `/timelines` (already implemented) and Lineage uses `lineageInsightProvider`.

Change log:
- [2025-12-08] v0.1 Initial implementation (backend endpoints + frontend wiring)


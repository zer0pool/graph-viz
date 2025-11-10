Title: Trigger Table Settings – Update (08)

Summary
- Adds APIs to set ON/OFF for a single job consuming a table, or bulk set for all consumers.
- Emits SSE events so open browser tabs keep their switches in sync.
- Frontend switches updated; fixed layering, placement and disabled state for the bulk button.

APIs
1) Single toggle
   - PATCH `/api/v1/tables/{full_name}/triggers/{job_id}`
   - Body: `{ "trigger": true|false }`
   - Response (success):
     { "status": "success", "job_id": "JOB_X", "table_name": "project.dataset.table", "previous_state": true, "new_state": false }

2) Bulk toggle all
   - PATCH `/api/v1/tables/{full_name}/triggers`
   - Body: `{ "trigger": false }` (UI uses All OFF)
   - Response: { "status": "success", "table_name": "...", "trigger": false, "changed": ["JOB_A", ...], "unchanged": ["JOB_B"], "count": 3, "total": 5 }

SSE
- Stream: GET `/api/v1/events/trigger-status`
- Event type: `trigger_update`
- Payload example:
  { "status": "success", "job_id": "JOB_X", "table_name": "project.dataset.table", "previous_state": true, "new_state": false }
- Backend: `src/graph_manager/api/v1/endpoints/events.py` and `src/graph_manager/core/sse.py` (broker).

Backend Implementation
- Endpoints: `src/graph_manager/api/v1/endpoints/tables.py`
  - `set_table_trigger()` and `bulk_set_table_trigger()` call `GraphService` and publish `trigger_update`.
- Service: `src/graph_manager/services/graph_service.py`
  - `set_table_trigger()` updates `GraphJobNode.trigger_tables` JSON and `graph_edge.is_trigger_on`; commits the transaction.
  - `bulk_set_table_triggers()` iterates all consumers, updates JSON and edge flags; commits.
- DB Commit Model
  - Request middleware performs commit on success; critical paths also call `uow.commit()` explicitly to guarantee persistence.

Frontend Implementation
- File: `src/graph_manager/static/js/main.js`
  - Renders switches for each consumer job.
  - Calls single/bulk PATCH endpoints with fetch.
  - Listens to SSE `trigger_update` and flips visible switches without altering component class names.
- Styles: `src/graph_manager/static/css/modern-console.css`
  - Slider layering fixes; ON text at left, knob at right; OFF shows label and knob correctly.
  - “All OFF” pill in the title row (right aligned), disabled when all are already OFF.

Usage Examples
- Single toggle OFF:
  curl -X PATCH "http://localhost:8000/api/v1/tables/demo.analytics.TABLE_06/triggers/JOB_TEST_06" \
       -H "Content-Type: application/json" -d '{"trigger": false}'

- Bulk OFF:
  curl -X PATCH "http://localhost:8000/api/v1/tables/demo.analytics.TABLE_06/triggers" \
       -H "Content-Type: application/json" -d '{"trigger": false}'

Notes
- Table path parameter must be the fully‑qualified name (project.dataset.table).
- The UI only updates the currently open table’s switches via SSE.
- See also diagnostics endpoint: GET `/api/v1/diagnostics/db` to verify DB connectivity during testing.


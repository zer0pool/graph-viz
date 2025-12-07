---
status: draft
owner: huey
created: 2025-12-08
updated: 2025-12-08
version: 0.1
related: [2025-12-07_table-lineage-summary-api]
tags: [frontend, detail-panel, job, table]
---

Created: 2025-12-08  
Updated: 2025-12-08  
Author: Data Platform Team  
Version: 0.1  
Status: Draft  
Title: P1.1 — Table & Job Detail Panel Real Data Integration

Summary:  
Implement fully dynamic table/job detail panels by wiring GraphController → PanelController with real metadata from the backend. Replace all placeholders with actual fields (overview, lineage, schema, activity) and ensure graceful handling of missing data.

## 1. Purpose
Provide accurate, production-grade table and job detail views so operators can rely on Lineage Manager for daily debugging without falling back to raw APIs.

## 2. Background
Current detail panels contain mock data or placeholders left over from the UI refactor. Node metadata retrieved from Job Manager / lineage API is only partially propagated to the UI.

## 3. Requirements
1. Fetch real metadata per node following the `node_type` policy.  
2. Populate every tab in the Table panel (Overview, Lineage summary, Schema, Activity).  
3. Populate the Job panel (Overview, Inputs, Outputs, Metadata).  
4. Display inputs grouped by type (table/storage) with badge/icon, support collapse/expand with “+ More tables…”.  
5. Handle missing values with `Unknown`, gray badges, or placeholder text.  
6. When a node is selected, GraphController must pass complete metadata to PanelController, which chooses the correct renderer based on `node_type`.

## 4. Design
- **Data flow**: GraphController fetches node metadata (existing API) → dispatches event to PanelController with `node.data`.  
- **PanelController**:  
  - Detect `node_type` (`table`, `job`, `storage`).  
  - Call `renderTableDetails` or `renderJobDetails`.  
  - Ensure each tab updates only when data is present; otherwise show placeholder.  
- **UI bindings**:  
  - Table Overview: show name, `project.dataset.table`, owner, created_by, last_modified, row_count, size_bytes, metadata badges.  
  - Table Lineage tab (basic counts) will be refined in P1.2.  
  - Schema tab: use `columns[]` data.  
  - Activity tab: show recent job executions touching this table.  
  - Job Overview: show schedule, trigger state, owner, description, metadata.  
  - Inputs/Outputs: lists with icons, collapse logic shared with table view.  
- **Graceful degradation**: `Unknown` badges, “No data found” placeholders, optional warning icon.  

## 5. Implementation Plan
1. **Backend check**: confirm node metadata includes all required fields; extend serializer if necessary.  
2. **GraphController**: attach full metadata to selection event, ensure caches are invalidated when nodes update.  
3. **PanelController**:  
   - Normalize node data (table/job/storage).  
   - Implement per-tab renderers using shared helpers (badge rendering, collapse state).  
4. **UI updates**:  
   - Add icons/badges for storage vs table.  
   - Ensure “More tables…” toggle appears when >3 items.  
5. **Error handling**: placeholder strings, `Unknown` chips, optional console warnings.  
6. **Testing**:  
   - Manual: select multiple nodes, verify UI updates.  
   - Unit/UI tests (if applicable) for helper functions.

## 6. Risks & Open Questions
- Missing metadata from backend; may require additional API fields.  
- Performance when selecting many nodes quickly; need caching/throttling?  
- Storage nodes visualization consistency (future requirement).  

## 7. Acceptance Criteria
- Selecting any table/job shows real data in all tabs (no mocks).  
- Missing fields show “Unknown” but do not break layout.  
- Input/output lists show correct icons and collapse behavior.  
- PanelController correctly distinguishes node types.  
- QA demo confirms parity with backend metadata responses.

## 8. Change Log
- [2025-12-08] v0.1 Draft created.

---
status: draft
owner: dewey
created: 2025-12-08
updated: 2025-12-08
version: 0.1
related: [2025-12-07_table-lineage-summary-api, 2025-12-08_table-job-detail-panel]
tags: [frontend, lineage, analytics]
---

Created: 2025-12-08  
Updated: 2025-12-08  
Author: Data Platform Team  
Version: 0.1  
Status: Draft  
Title: P1.2 — Lineage Summary Panel Integration

Summary:  
Bind the Table Detail → Lineage tab to real backend metrics (root/leaf counts, depth, summaries, path preview) using the lineage API. Replace placeholders in insight cards, preview, and “View all” drawers with computed data, caching per node to avoid redundant queries.

## 1. Purpose
Expose actionable lineage insights (root/leaf counts, upstream/downstream depth) so users can assess blast radius and data health without leaving the detail panel.

## 2. Background
Lineage cards currently show static zeros. Backend lineage APIs already expose counts and path information; we need to surface them in the UI.

## 3. Requirements
1. Populate metrics: root tables, leaf tables, upstream/downstream table+job counts, depth summary (max hops), path preview text, “Show full path” drawer.  
2. Use backend lineage API for upstream/downstream traversal (closure-table/DAG queries).  
3. Cache lineage summaries per table node to avoid repeat computation during the same session.  
4. Update UI components: insight cards, depth summary, preview text, “View all” modal/drawer buttons.  
5. Ensure data stays in sync when graph expands or table selection changes.  

## 4. Design
- **API layer**: extend `api.js` with `fetchTableLineageSummary(tableId)` calling `/api/v1/tables/{id}/lineage-summary` (new or existing endpoint).  
- **PanelController**: when Table tab `lineage` becomes active and data not cached, fetch summary, store in `lineageProvider`.  
- **LineageInsightProvider**: restructure state to include counts, depth, path preview, expanded lists.  
- **UI bindings**:  
  - Insight cards show numeric values; fallback to 0 with tooltip if missing.  
  - “View all” buttons open drawer populated with cached upstream/downstream arrays.  
  - Path preview text truncates long paths; “Show full path” reveals modal/drawer.  
- **Caching**: map `{tableId: summary}` with timestamp; invalidate when graph refreshes or table node updates.  

## 5. Implementation Plan
1. Confirm backend API shape (fields: `root_count`, `leaf_count`, `upstream`, `downstream`, `depth`, `path_preview`).  
2. Update frontend service (`api.js`) and state provider to request and store summaries.  
3. Wire PanelController `bindTabEvents` to trigger fetch on `lineage` tab activation.  
4. Render insight cards + preview with new data, handle loading spinner + error states.  
5. Implement “View all” drawers (reuse existing lineage drawer).  
6. Add caching + invalidation logic.  
7. QA with multiple tables, large DAGs to ensure performance.  

## 6. Risks & Open Questions
- Backend API performance on very large graphs; might need pagination or thresholds.  
- How to represent storage nodes vs tables in upstream/downstream lists?  
- Should path preview prefer shortest or “representative” path?  

## 7. Acceptance Criteria
- Lineage tab shows non-zero metrics when data exists; zeros only when actual counts are zero.  
- “View all” buttons list actual nodes.  
- Path preview and “Show full path” display backend-provided data.  
- Switching between tables reuses cached summaries; no redundant fetches during a session.  
- Manual QA verifies parity with backend API responses.  

## 8. Change Log
- [2025-12-08] v0.1 Draft created.

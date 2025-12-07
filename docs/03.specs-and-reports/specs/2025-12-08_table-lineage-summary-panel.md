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


📘 Lineage Summary API — Response Specification

Endpoint

GET /api/v1/tables/{full_name}/lineage-summary


Purpose
Provide all metrics required by the Lineage Summary Panel.

✅ Full Response Structure (Final)
{
  "status": "success",
  "table": "project.dataset.table",

  "metrics": {
    "root_count": 3,
    "leaf_count": 5,
    "upstream_table_count": 12,
    "downstream_table_count": 18,
    "upstream_job_count": 7,
    "downstream_job_count": 11,

    "depth": {
      "upstream": 4,
      "downstream": 3
    }
  },

  "upstream": {
    "root_tables": [
      "a.b.root1",
      "a.b.root2",
      "a.b.root3"
    ],
    "tables": [
      "a.b.t1",
      "a.b.t2",
      "a.b.t3"
    ],
    "jobs": [
      "job_load_t1",
      "job_transform_t2"
    ]
  },

  "downstream": {
    "leaf_tables": [
      "x.y.leaf1",
      "x.y.leaf2",
      "x.y.leaf3",
      "x.y.leaf4",
      "x.y.leaf5"
    ],
    "tables": [
      "x.y.t1",
      "x.y.t2",
      "x.y.t3"
    ],
    "jobs": [
      "job_consume_t1",
      "job_aggregate_t2"
    ]
  },

  "paths": {
    "preview": [
      ["root1", "t5", "t6", "target"],
      ["target", "t9", "leaf3"]
    ],

    "full": [
      ["root1", "t5", "t6", "target", "t9", "leaf3"],
      ["root2", "t7", "target"],
      ["target", "t12", "t14", "leaf5"]
    ]
  },

  "timestamp": "2025-12-08T14:31:00Z",
  "cache": {
    "cached": false,
    "expires_in_sec": 300
  }
}

📌 필드 설명 (Frontend Integration 기준)
1. status

"success"

"error" (예: unknown table, lineage missing)

2. table

요청된 table ID (canonical full name)

3. metrics

Lineage 패널 insight cards가 사용하는 핵심 수치.

Field	Description
root_count	unique upstream root table count
leaf_count	unique downstream leaf table count
upstream_table_count	all upstream tables
downstream_table_count	all downstream tables
upstream_job_count	jobs producing upstream tables
downstream_job_count	jobs consuming this table
depth.upstream	max hops from root → target
depth.downstream	max hops from target → leaf
4. upstream / downstream

실제 Node 리스트 (drawer “View all” 버튼에서 사용)

upstream
root_tables[]  ← 최상단 노드 목록
tables[]       ← 전체 upstream 테이블
jobs[]         ← 전체 upstream job 목록

downstream
leaf_tables[]  ← 최하단 노드 목록
tables[]       ← 전체 downstream 테이블
jobs[]         ← 전체 downstream job 목록

5. paths

Path preview + full path list 제공

preview: 짧은 리스트 (패널에서 바로 표시)

full: “Show full path” drawer 에서 사용

각 path 는 배열로 표현:
["root", "node1", "node2", "target"]

6. timestamp

백엔드 계산 시각

프론트 캐싱 시간 계산에 사용

7. cache

프론트/백엔드 캐싱 고려를 위해 포함

Example:

"cache": {
  "cached": true,
  "expires_in_sec": 300
}

📘 Optional Fields (확장 고려)

백엔드에 존재한다면 다음을 포함할 수도 있음:

"graph": {
  "node_count": 123,
  "edge_count": 212
}


또는 성능 최적화를 위해:

"limits": {
  "truncated": true,
  "max_nodes": 200
}

💡 Frontend Usage Mapping
Insight Cards

root_count

leaf_count

upstream_table_count

downstream_table_count

depth

Preview Panel

paths.preview

Drawer

upstream.tables

downstream.tables

paths.full

Caching

cache.cached

timestamp


## 8. Change Log
- [2025-12-08] v0.1 Draft created.

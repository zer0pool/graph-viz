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



📘 Table Detail Panel — Full Specification

Created: 2025-12-08
Version: 1.0
Status: Draft
Author: Lineage Manager Team

1. Overview

The Table Detail Panel appears on the right side of the UI when a table node is selected from the graph.
It follows a design similar to Google BigQuery Console and consists of four tabs:

Overview | Lineage | Schema | Activity


Each tab loads its data through dedicated APIs, using a lazy-loading approach to improve performance and responsiveness.

2. Panel Structure
[Table Detail Panel]

┌─────────────────────────────────────────────┐
│ Tabs: Overview | Lineage | Schema | Activity
├─────────────────────────────────────────────┤
│ [Overview Tab]                              
│   - Basic Info                              
│   - Table Info (2-column grid)              
│   - Storage Info (2-column grid)
│
│ [Lineage Tab]
│   - Upstream Summary
│   - Downstream Summary
│   - Depth Summary
│   - Path Preview
│
│ [Schema Tab]
│   - Search box
│   - Schema table (columns)
│
│ [Activity Tab]
│   - Loading Activity Summary
│   - Daily Summary Chart
│   - Hourly Breakdown Chart (hourly tables only)
└─────────────────────────────────────────────┘

3. Architectural Approach
3.1 Lazy-loading per Tab
Tab	When Data Loads
Overview	Immediately when the panel opens
Lineage	First time the tab is opened
Schema	First time the tab is opened
Activity	First time the tab is opened
3.2 Panel State Model
panelState = {
  activeTab: "overview",
  detail: null,
  lineage: null,
  schema: null,
  activity: null,
  loading: {
    detail: false,
    lineage: false,
    schema: false,
    activity: false
  }
}

4. Overview Tab
4.1 Components
Overview
──────────────────────────────────────────────
Basic Info
Table Info
Storage Info

4.2 Basic Info
Label	Value
Full Name	project.dataset.table
Table Type	TABLE / VIEW / MATERIALIZED VIEW
Description	Description text
Owner	Optional
Last Processed Time	Optional
4.3 Table Info
Label	Value	Source
Created	timestamp	BigQuery metadata
Last Modified	timestamp	BigQuery metadata
Table Expiration	timestamp or "Never"	BigQuery metadata
Data Location	region	BigQuery metadata
4.4 Storage Info
Label	Value	Source
Total Rows	num_rows	table.num_rows
Total Bytes	num_bytes	table.num_bytes
Partitioning	DAY(event_date) / None	time_partitioning
Clustering	col1, col2	clustering_fields
Encryption	kms key	encryption_configuration
4.5 Overview API
GET /api/v1/tables/{full_name}/detail

Example Response
{
  "full_name": "gizmopool.test_data.table_load_history",
  "table_type": "TABLE",
  "description": "Daily load history",
  "location": "US",
  "created": "2025-11-10T19:07:12+09:00",
  "modified": "2025-11-10T19:07:12+09:00",
  "expires": null,
  "labels": { "env": "dev" },
  "storage": {
    "num_rows": 1234567,
    "num_bytes": 9123409123,
    "partitioning": "DAY(event_date)",
    "clustering": ["region"],
    "encryption": "Google-managed key"
  }
}

5. Lineage Tab
5.1 Components
Lineage Summary
──────────────────────────────────────────────
Upstream Root Nodes
Downstream Leaf Nodes
Depth Summary
Path Preview (short previews)
[View in Graph]

5.2 Lineage Summary API
GET /api/v1/lineage/tables/{full_name}/summary

Example Response
{
  "upstream_roots": ["a.b.root1", "a.b.root2"],
  "downstream_leaves": ["x.y.leaf1"],
  "depth": {
    "upstream": 4,
    "downstream": 3
  },
  "paths_preview": [
    ["A", "B", "C", "target"],
    ["target", "D", "E"]
  ]
}

6. Schema Tab
6.1 Components
Schema
──────────────────────────────────────────────
[ Search Box ]
[ Schema Table ]


Table contains:

name

type

mode

description

policy tags

Client-side search is applied.

6.2 Schema API
GET /api/v1/tables/{full_name}/schema

Example Response
{
  "columns": [
    {
      "name": "event_date",
      "type": "DATE",
      "mode": "NULLABLE",
      "description": "Date of event",
      "policy_tags": ["pii.basic"]
    }
  ]
}

7. Activity Tab
7.1 Components
Activity
──────────────────────────────────────────────
1. Loading Activity Summary
2. Daily Summary Chart
3. Hourly Breakdown Chart (only for hourly tables)

7.2 Loading Activity Summary

Derived data from Activity API + table schedule metadata:

Label	Description
Schedule Type	daily / hourly / weekly
Last Successful Load	most recent loaded interval
Next Expected Load	estimated based on schedule
Success Rate	average of daily_summary.rate

Example:

Schedule Type: Hourly
Last Successful Load: 2025-04-07 19:00
Next Expected Load: 2025-04-07 20:00
Success Rate (7 days): 83%

7.3 Daily Summary Chart

Input: result.daily_summary[]

Displayed as a 7-day or 30-day bar/heatmap chart.

Color rules:

status	color
good	green
warning	yellow
bad	red

Clicking a date allows showing Hourly Breakdown.

7.4 Hourly Breakdown (x-axis hour chart)

Shown only for hourly tables.

When a day is selected:

0  1  2  3 ... 23
🟥 🟩 🟩 🟥     🟩


Color mapping:

loaded → green

missing → gray

failed → red

A 24-cell bar/heatmap chart aligned left-to-right on the x-axis.

7.5 Activity API
GET /api/v1/tables/{table}/timelines?days=7

Example Response
{
  "status": "success",
  "result": {
    "daily_summary": [
      { "date": "2025-04-01", "success_count": 24, "fail_count": 0, "status": "good", "rate": 1 }
    ],
    "hourly_detail": {
      "2025-04-07": [
        { "hour": "00", "state": "missing", "interval_start": "...", "interval_end": "..." },
        { "hour": "01", "state": "loaded", ... }
      ]
    }
  }
}
Note: Backend uses `period` or `cron_schedule` column to detect hourly vs daily.
Note: Backend queries `gizmopool.test_data.table_load_history`.

8. Frontend Behavior
8.1 Activity Tab Initialization
loadActivity()
→ Fetch /timelines
→ Render Loading Summary
→ Render Daily Summary Chart
→ Render empty Hourly Breakdown section

8.2 Daily Summary Interaction
User clicks a date
→ If hourly table:
       render Hourly Breakdown
→ Else:
       show notice “Hourly breakdown available only for hourly tables.”

9. Summary

The Table Detail Panel contains 4 tabs: Overview / Lineage / Schema / Activity

Each tab uses its own API and loads independently

Overview uses BigQuery-style layout

Lineage summarises upstream/downstream structure

Schema displays detailed column info with search

Activity visualizes ingestion health: daily + hourly charts

Hourly chart is x-axis-based, 24-unit bar visualization

## 8. Change Log
- [2025-12-08] v0.1 Draft created.
- [2025-12-08] v0.2 Added Detail desigsn.

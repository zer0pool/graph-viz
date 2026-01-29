---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [design.md]
tags: [backend, api, endpoints, reference]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.1
Status: Shipped
Title: Lineage Manager: API Endpoints Reference

Summary:
Categorized list of RESTful API endpoints provided by the Lineage Manager backend. Covers graph initialization, synchronization, traversal, and job management.

---

## 1. Graph Management

### Initialize and Sync
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/graph/init` | Fetch full job list and initialize graph nodes and edges. |
| POST | `/api/graph/sync` | Sync with external Job Manager or DB (reflect new jobs/refs). |
| POST | `/api/graph/rebuild/edges` | Reconstruct edges only based on the job table. |
| POST | `/api/graph/rebuild/closure` | Regenerate the Closure Table (ancestor-descendant relations). |
| DELETE | `/api/graph/reset` | Full graph data reset (delete nodes, edges, and closures). |

---

## 2. Graph Traversal

### Search & Lineage
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/graph/job/{job_id}/downstream` | Retrieve all downstream nodes from a specific job. |
| GET | `/api/graph/job/{job_id}/upstream` | Retrieve all upstream nodes for a specific job. |
| GET | `/api/graph/job/{job_id}/neighbors` | Retrieve immediate neighbors (bidirectional) for a job. |
| GET | `/api/graph/table/{table_name}/downstream` | List jobs that depend on (read) a specific table. |
| GET | `/api/graph/table/{table_name}/upstream` | List jobs that created (produced) a specific table. |
| GET | `/api/graph/table/{table_name}/ancestors` | Retrieve top-level ancestor tables for the given table. |
| GET | `/api/graph/path` | Calculate the dependency path and distance between two nodes. |

---

## 3. Job Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/graph/job/update` | Reflect job changes from Job Manager into the graph. |
| POST | `/api/graph/job/delete` | Cleanup edges and closure entries when a job is deleted. |
| GET | `/api/graph/status` | Current graph status (node/edge counts, last sync time). |
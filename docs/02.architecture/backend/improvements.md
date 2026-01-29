---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [endpoints.md]
tags: [backend, roadmap, api, monitoring]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.1
Status: Shipped
Title: Lineage Manager: API Improvements & Roadmap

Summary:
Outlines the planned structural changes and functional enhancements for the Lineage Manager API. Includes proposals for impact analysis metrics, monitoring, and visualization data optimization.

---

## 1. API Structural Changes

### 1.1 Base URL Update
- **Old**: `/api/graph/*`
- **New**: `/api/graph-manager/*`
- **Rationale**: Better reflects the scope and purpose of the management layer.

### 1.2 Endpoint Systematization

#### Impact Analysis Enhancements
| Type | Old Endpoint | New Endpoint | Note |
| :--- | :--- | :--- | :--- |
| Impact Lookup | `/api/graph/job/{id}/impact` | `/api/graph-manager/job/{id}/impact?depth=3` | Added depth parameter. |
| Table Deps | `/api/graph/table/{name}/deps` | `/api/graph-manager/table/{name}/deps` | Column-level analysis. |
| Bottlenecks | `/api/graph/bottlenecks` | `/api/graph-manager/bottlenecks?threshold=0.8` | Added threshold filter. |

---

## 2. Advanced Analysis Endpoints

### Impact & Critical Path
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/graph/job/{id}/impact` | Score-based impact and importance analysis. |
| GET | `/api/graph/job/{id}/critical-path` | Retrieve the critical path containing this job. |
| GET | `/api/graph/bottlenecks` | Identify jobs that act as major bottlenecks. |

### Visualization Data
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/graph/view/timeline` | Timeline-view data for job execution history. |
| GET | `/api/graph/view/hierarchy` | Hierarchical (Project/Owner/Job) tree data. |
| GET | `/api/graph/view/matrix` | Dependency matrix data (Table ↔ Job mapping). |

---

## 3. Planned Metadata Enhancements

### Node (Job) Metadata
- Average execution time.
- Failure rates / SLA success metrics.
- Resource consumption (CPU/Memory).
- Owner/Team assignment and importance level.

### Edge (Dependency) Metadata
- Dependency type (Data, API, Trigger).
- SLA requirements for downstream propagation.
- Data throughput (Bytes transferred).

---

## 4. Usage Scenarios

### SLA Risk Management
Operators use the `critical-path` API to identify segments with high delay risk. By identifying paths with long execution times, they can pre-emptively detect SLA violations.

### Bottleneck Identification
The `bottlenecks` API helps detect nodes with high average latency or high degree centrality, allowing teams to optimize the most critical parts of the pipeline.

### Impact Simulation
Before deleting a table or re-scheduling a job, users can run the `impact` simulation to see exactly which downstream services will be affected and to what degree (Score).
# [Design] Lineage-Manager V2 Specification (Command Side)

> **Document Metadata**
> - **Version**: 2.0.0
> - **Last Updated**: 2026-02-14
> - **Status**: Active Specifications

This document provides a complete design specification for `lineage-manager-v2`, the command-side service responsible for maintaining job and table metadata, ingesting and updating lineage graphs, and serving REST endpoints for DAG traversals and impact analysis. It reflects lessons learned from the original (v1) implementation and adjusts the architecture to work alongside the new `metrics-manager` query service.

**Key Changes from V1**:
- Fully asynchronous stack (FastAPI + SQLAlchemy 2.0 Async)
- Explicit Unit-of-Work pattern
- CQRS separation (command side only)
- Cleaner domain model with explicit Project/Job/User relationships

---

## 1. Why V2? Lessons from V1

### V1 Limitations

| Issue | Impact | V2 Solution |
|:---|:---|:---|
| **Synchronous code paths** | Thread blocking, limited scalability | Full async I/O (AsyncSession, async Redis) |
| **Layered architecture** | Business rules scattered across layers | DDD with domain services |
| **Tight read/write coupling** | Same service handles CRUD and analytics | CQRS: v2 = command, metrics-manager = query |
| **Technical debt** | Organic growth, inconsistent patterns, limited tests | Clean DDD structure, 100% unit test coverage, explicit error handling |

### V2 Goals

1. **Asynchronous I/O throughout** – FastAPI async endpoints, SQLAlchemy 2.0 AsyncSession, non-blocking Redis
2. **Domain-Driven Design (DDD)** – Clear separation: entities, repositories, use-case handlers, infrastructure
3. **Command/Query Responsibility Segregation (CQRS)** – lineage-manager v2 = command side (authoritative data, CRUD, ingestion, events); metrics-manager = query side (analytics, dashboards, GraphQL)
4. **Clean domain model** – Explicit Project→Job (1:N) and Project↔User (N:N) relationships
5. **Testability** – 100% unit test coverage on domain rules

---

## 2. High-Level Architecture

### 2.1 Service Responsibilities

| Service | Side | Protocol | Responsibilities |
|:---|:---|:---|:---|
| **lineage-manager v2** | Command | REST | Create/update/delete jobs and tables; ingest lineage graph; provide DAG traversal and impact analysis; publish events; maintain audit logs |
| **metrics-manager** | Query | GraphQL | Dashboard metrics, performance analytics, historical trends, list filtering (widgets); consumes events from lineage-manager |

### 2.2 Component Diagram

```
Client (Frontend)
   │
   ├── REST calls for CRUD & DAG traversal → lineage-manager-v2
   │     (Nginx routes /api/lineage-manager → lineage-manager-v2)
   │
   └── GraphQL queries for dashboards, lists, metrics → metrics-manager
         (Nginx routes /api/metrics-manager → metrics-manager)

lineage-manager-v2
   ├── FastAPI REST API (auth & rate-limiting middleware)
   ├── Orchestration (Use-case handlers)
   ├── Domain (Jobs, Tables, Edges, Audit)
   ├── Repositories (async MySQL)
   ├── Unit-of-Work (explicit transaction scope)
   ├── Redis (rate limiting & caching)
   └── Event Publisher (async Redis Pub/Sub → metrics-manager)

metrics-manager
   ├── FastAPI + Strawberry GraphQL server
   ├── Query layer (Stats, Performances, History)
   ├── Projection DB (BigQuery + read replicas)
   └── Redis cache for query results
```

### 2.3 Auth & Rate Limiting

All requests to `lineage-manager-v2` must include an `X-Authenticated-User` header of the form `user_id:scope`.

- **user_id**: Identifies the caller
- **scope**: Permission group (`admin`, `editor`, `viewer`)

**Middleware**:
- Extracts header
- Validates JWT (in deployments behind ingress)
- Applies rate limiting using Redis (per user and per IP)
- Injects `request.state.user` for downstream handlers

---

## 3. Domain Model

The domain captures projects, jobs, tables, users, and lineage edges.

### Resource Relationships

```mermaid
erDiagram
    Project ||--o{ Job : "1:N (has jobs)"
    Project }o--o{ User : "N:N (members)"
    Job }o--o{ User : "N:N (owners)"

    Project {
        string project_id PK "str(100)"
        string display_name
        string description
    }

    Job {
        int id PK
        string job_id UK "project_id-job_name"
        string project_id FK
        string name
        string status "active / paused / archived"
        json schedule
        json properties
    }

    User {
        int id PK "internal"
        string user_id UK "str(100) - used for relations"
        string login_id UK
        string department
        string status
    }
```

- **Project : Job** = 1:N — A job belongs to exactly one project
- **Project : User** = N:N (members) — A user can be a member of multiple projects; a project can have multiple members
- **Job : User** = N:N (owners) — A job can have multiple owners; a user can own multiple jobs

**Reverse lookups are supported:**
- By **User ID** (`user_id`) → list of projects (membership), list of jobs (ownership)
- By **Project ID** (`project_id`) → list of jobs, list of members (users)

The database ID strategy aligns with the active schemas:
- **Jobs/Tables/Edges** use `Integer` PK.
- **Projects** use `String` PK (`project_id`).
- **Users** use `String` key (`user_id`) for all relationship foreign keys.

### 3.1 ID Strategy

All entities use **integer auto-increment** as the database primary key (`id`). Business-level unique identifiers are derived from domain attributes:

| Entity | DB Primary Key | Business/Relation Key | Example |
|:---|:---|:---|:---|
| **Job** | `id` (int) | `job_id` (uk) | `annual_report-active_user_v1` |
| **Table** | `id` (int) | `fqn` (uk) | `project.dataset.source_table` |
| **Project** | `project_id` (str) | `project_id` (pk) | `annual_report` |
| **User** | `id` (int) / `user_id` (str) | `user_id` (uk, used for FKs) | `user_12345` |
| **AuditLog** | `id` (int) | — | — |

### 3.2 Entities

```python
# app/domain/graph/entities.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, List

@dataclass
class Job:
    """Job entity (Aggregate Root)"""
    id: int                       # DB primary key
    project_id: str               # Project ID string (FK)
    name: str                     # Job name
    owners: List[str]             # List of user_id strings
    schedule: Optional[Dict]
    status: str
    properties: Dict
    created_at: datetime
    updated_at: datetime

    @property
    def job_id(self) -> str:
        """Business key: derived from project_id and job name."""
        return f"{self.project_id}-{self.name}"

    def pause(self):
        if self.status == "archived":
            raise ValueError("Cannot pause archived job")
        self.status = "paused"

    def resume(self):
        if self.status == "archived":
            raise ValueError("Cannot resume archived job")
        self.status = "active"

@dataclass
class Table:
    """Table entity"""
    id: int                  # DB primary key
    project_id: str          # Project ID string
    fqn: str                 # Business key
    schema_info: Dict
    properties: Dict
    created_at: datetime
    updated_at: datetime

@dataclass
class Edge:
    """Lineage edge entity"""
    id: int
    source_id: int           # FK to graph_node
    target_id: int           # FK to graph_node
    edge_type: str
    properties: Dict
    created_at: datetime

@dataclass
class AuditLog:
    """Audit log entity (Aligned with Schema 0005)"""
    id: int                  # DB primary key
    command_type: str        # e.g., 'create_job'
    target_id: str           # Target entity ID (string)
    payload: Dict            # JSON payload
    performed_by: str        # user_id string
    status: str              # 'SUCCESS', 'bFAILED'
    visited_at: datetime
```

### 3.2 Repositories & Unit of Work

**Repositories** encapsulate persistence for each aggregate. They accept and return domain entities.

**UnitOfWork** holds a single `AsyncSession` and lazily constructs repositories, providing `commit()` and `rollback()` methods.

```python
# app/infrastructure/persistence/uow.py
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.graph.repository import JobRepository, TableRepository, EdgeRepository
from app.infrastructure.persistence.repositories.graph_repo import (
    SQLAlchemyJobRepository,
    SQLAlchemyTableRepository,
    SQLAlchemyEdgeRepository
)

class UnitOfWork:
    """Manages database transaction lifecycle"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self._jobs: Optional[JobRepository] = None
        self._tables: Optional[TableRepository] = None
        self._edges: Optional[EdgeRepository] = None
    
    @property
    def jobs(self) -> JobRepository:
        if self._jobs is None:
            self._jobs = SQLAlchemyJobRepository(self.session)
        return self._jobs
    
    @property
    def tables(self) -> TableRepository:
        if self._tables is None:
            self._tables = SQLAlchemyTableRepository(self.session)
        return self._tables
    
    @property
    def edges(self) -> EdgeRepository:
        if self._edges is None:
            self._edges = SQLAlchemyEdgeRepository(self.session)
        return self._edges
    
    async def commit(self):
        await self.session.commit()
    
    async def rollback(self):
        await self.session.rollback()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
        await self.session.close()
```

---

## 4. API Specification (REST)

All REST endpoints are prefixed with `/api/v2`. Unless otherwise specified, responses follow JSON format with a `status: success|error` field and either a `result` or `detail` field.

### 4.1 Job CRUD & Lifecycle

#### `POST /api/v2/jobs`

Create a new job.

**Request**:
```json
{
  "project_id": "annual_report",
  "name": "active_user_v1",
  "owners": ["user_123", "user_456"],
  "schedule": {"cron": "0 2 * * *", "start_date": "2026-01-01"},
  "properties": {"description": "Aggregates daily metrics"}
}
```

**Response** (`201 Created`):
```json
{
  "id": 1023,
  "job_id": "annual_report-active_user_v1",
  "project_id": "annual_report",
  "name": "active_user_v1",
  "owners": ["user_123", "user_456"],
  "status": "active",
  "schedule": {"cron": "0 2 * * *", "start_date": "2026-01-01"},
  "properties": {"description": "Aggregates daily metrics"},
  "created_at": "2026-02-14T10:00:00Z"
}
```



**Event**: Publishes `JOB_CREATED` to metrics-manager.

---

#### `GET /api/v2/jobs/{job_id}`

Retrieve job details by ID.

**Note**: `{job_id}` is the business key (e.g., `annual_report-active_user_v1`), not the DB integer `id`.

**Response**: `200 OK` with job record, or `404 Not Found`.

---

#### `PUT /api/v2/jobs/{job_id}`

Update mutable fields (name, schedule, properties).

**Response**: `200 OK` with updated record.

**Event**: Publishes `JOB_UPDATED`.

---

#### `DELETE /api/v2/jobs/{job_id}`

Archive a job (sets `status` to `archived`).

**Response**: `204 No Content`.

**Event**: Publishes `JOB_DELETED`.

---

#### `PATCH /api/v2/jobs/{job_id}/status`

Change job status between `active` and `paused`.

**Request**:
```json
{
  "status": "paused"
}
```

**Business Rules**: Cannot pause or resume archived jobs.

**Response**: `200 OK` with updated job.

---

### 4.2 Table CRUD

Tables are primarily created through ingestion, but manual editing is supported.

#### `POST /api/v2/tables`

Create a new table record.

**Request**:
```json
{
  "project_id": "analytics",
  "fqn": "analytics.dataset.source_table",
  "schema_info": {},
  "properties": {}
}
```

---

#### `GET /api/v2/tables/{fqn}`

Retrieve table details by fully qualified name.

**Response**: `200 OK` with table record, or `404 Not Found`.

---

#### `PUT /api/v2/tables/{fqn}`

Update table schema or properties.

**Response**: `200 OK` with updated record.

---

### 4.3 Graph Ingestion & Initialisation

#### `POST /api/v2/graph/init`

Trigger a complete rebuild of the lineage graph.

**Query Parameters**:
- `drop_existing` (bool, default `false`) – Drop all existing nodes/edges before rebuilding
- `concurrency` (int) – Number of concurrent ingestion workers
- `from_date` / `to_date` – Optional ISO-date strings restricting ingestion

**Response**: Returns immediately with a job identifier. Runs asynchronously via Celery.

**Example**:
```bash
POST /api/v2/graph/init?drop_existing=true&concurrency=4
```

---

#### `GET /api/v2/graph/status`

Return the status of the most recent initialisation run.

**Response**:
```json
{
  "status": "running",
  "progress": {
    "jobs_processed": 1200,
    "tables_processed": 850,
    "edges_created": 3400,
    "total_jobs": 1543
  },
  "started_at": "2026-02-14T10:00:00Z",
  "estimated_completion": "2026-02-14T10:15:00Z"
}
```

**Possible statuses**: `pending`, `running`, `failed`, `completed`.

---

#### `POST /api/v2/jobs/sync`

Incrementally sync lineage for a set of jobs.

**Request**:
```json
{
  "job_ids": ["guid1", "guid2"],
  "dry_run": false
}
```

**Behavior**:
- `dry_run: true` – Returns a report of changes without persisting
- `dry_run: false` – Creates/updates nodes and edges, publishes `GRAPH_SYNCED` events

**Response**:
```json
{
  "status": "success",
  "changes": {
    "jobs_updated": 2,
    "tables_created": 5,
    "edges_created": 12
  }
}
```

---

### 4.4 Lineage Graph Traversal & Impact Analysis

These endpoints serve DAG traversal and impact analysis queries. They remain in `lineage-manager-v2` (REST) because they are simple lookups heavily used by the lineage UI.

#### `GET /api/v2/lineage/graph`

Return a simplified graph for a given node.

**Query Parameters**:
- `node_id` (required) – Format: `job:{job_id}` or `table:{fqn}`
- `depth` (int, default `1`, range `1-2`) – Number of hops to traverse
- `direction` (optional) – `upstream`, `downstream`, or omitted (both directions)

**Response**:
```json
{
  "nodes": [
    {
      "id": "job:123",
      "type": "job",
      "label": "daily_agg",
      "metadata": {
        "owners": ["john@company.com", "jane@company.com"],
        "status": "active"
      }
    },
    {
      "id": "table:analytics.dataset.table",
      "type": "table",
      "label": "analytics.dataset.table",
      "metadata": {
        "row_count": 1000000
      }
    }
  ],
  "edges": [
    {
      "source": "job:123",
      "target": "table:analytics.dataset.table",
      "type": "produces"
    }
  ]
}
```

**Notes**:
- Replaces v1's `/lineage/graph` and `/graph/table/{fqn}/dag`
- Mermaid/Cytoscape-compatible response (without layout coordinates)
- Frontend can render DAGs without re-querying metrics-manager

---

#### `GET /api/v2/lineage/table/{fqn}/impact`

Return upstream or downstream impact for a given table.

**Query Parameters**:
- `direction` (required) – `upstream` or `downstream`
- `depth` (int, default `1`) – Number of hops to traverse
- `include_jobs` (bool, default `true`) – Include impacting jobs

**Response**:
```json
{
  "table": "analytics.dataset.table",
  "direction": "downstream",
  "impacted_tables": [
    "analytics.ds.other",
    "analytics.ds.final"
  ],
  "impacted_jobs": [
    "job:daily_agg",
    "job:weekly_report"
  ]
}
```

**Use Cases**:
- "What will be broken if I change table X?" (downstream)
- "What upstream dependencies feed into table Y?" (upstream)

**Limits**: Maximum depth and node count enforced to prevent runaway traversals.

---

#### `GET /api/v2/lineage/job/{job_id}/neighbors`

Return direct upstream and downstream neighbors for a job.

**Response**:
```json
{
  "job_id": "123",
  "upstream": [
    {"id": "table:source_a", "type": "table"},
    {"id": "table:source_b", "type": "table"}
  ],
  "downstream": [
    {"id": "table:target_c", "type": "table"}
  ]
}
```

**Use Case**: Context menus, summary pages.

---

### 4.5 Search & Autocomplete

Quick suggestions using simple LIKE queries on the write database. Not suitable for heavy analytics (use metrics-manager for complex filtering).

#### `GET /api/v2/search/jobs`

**Query Parameters**: `q` (required, min length 2)

**Response**:
```json
{
  "results": [
    {"id": 123, "job_id": "analytics-daily_agg", "name": "daily_agg", "project_id": "analytics"},
    {"id": 456, "job_id": "ops-daily_cleanup", "name": "daily_cleanup", "project_id": "ops"}
  ]
}
```

---

#### `GET /api/v2/search/tables`

**Query Parameters**: `q` (required)

**Response**:
```json
{
  "results": [
    {"id": 101, "fqn": "analytics.dataset.table", "project_id": "analytics"},
    {"id": 102, "fqn": "analytics.dataset.other", "project_id": "analytics"}
  ]
}
```

---

### 4.6 Audit Log

#### `GET /api/v2/audit`

Retrieve audit log entries. **Requires `admin` scope.**

**Query Parameters**:
- `command_type` (optional) – Filter by action (e.g., `create_job`)
- `performed_by` (optional) – Filter by user_id
- `target_id` (optional) – Filter by target ID
- `from_date` / `to_date` (optional) – Date range filter
- `limit` (int, default `50`) – Maximum results
- `offset` (int, default `0`) – Pagination offset

**Response**:
```json
{
  "total": 234,
  "results": [
    {
      "id": 5001,
      "performed_by": "user_id_123",
      "command_type": "pause_job",
      "target_id": "job:1023",
      "payload": {"reason": "maintenance", "job_id": "annual_report-active_user_v1"},
      "status": "SUCCESS",
      "visited_at": "2026-02-14T10:30:00Z"
    }
  ]
}
```

---

### 4.7 Health & Diagnostics

#### `GET /api/v2/health`

Return service health and database connectivity.

**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "2.0.0"
}
```

---

### 4.8 Resource Lookups (Project / User Navigation)

These endpoints provide navigational lookups across Project, Job, and User relationships. They live in `lineage-manager-v2` (REST) because they query **authoritative relationship data** in the write database — not analytics.

> **Design Decision**: Simple relationship traversals (e.g., "which jobs belong to this project?") are CRUD-adjacent and belong in the command-side service. Complex aggregations (e.g., "top 10 users by job execution count with failure rates") belong in metrics-manager GraphQL.

#### `GET /api/v2/projects/{project_id}/jobs`

List all jobs belonging to a project.

**Response**:
```json
{
  "project_id": "annual_report",
  "jobs": [
    {"id": 1023, "job_id": "annual_report-active_user_v1", "name": "active_user_v1", "status": "active"},
    {"id": 1024, "job_id": "annual_report-monthly_summary", "name": "monthly_summary", "status": "paused"}
  ]
}
```

---

#### `GET /api/v2/projects/{project_id}/members`

List all users who are members of a project.

**Response**:
```json
{
  "project_id": "annual_report",
  "members": [
    {"user_id": "user_123", "login_id": "john@company.com", "department": "Data Engineering"},
    {"user_id": "user_456", "login_id": "jane@company.com", "department": "Analytics"}
  ]
}
```

---

#### `GET /api/v2/users/{user_id}/projects`

List all projects a user is a member of.

**Response**:
```json
{
  "user_id": "user_123",
  "projects": [
    {"project_id": "annual_report", "job_count": 5},
    {"project_id": "daily_pipeline", "job_count": 12}
  ]
}
```

---

#### `GET /api/v2/users/{user_id}/jobs`

List all jobs owned by a user (across all projects).

**Response**:
```json
{
  "user_id": "user_123",
  "jobs": [
    {"id": 1023, "job_id": "annual_report-active_user_v1", "project_id": "annual_report", "status": "active"},
    {"id": 2001, "job_id": "daily_pipeline-etl_raw", "project_id": "daily_pipeline", "status": "active"}
  ]
}
```

---

#### REST vs GraphQL Boundary for Resource Lookups

| Query Type | Where | Why |
|:---|:---|:---|
| Project → jobs list | **REST** (lineage-manager) | Simple FK traversal on authoritative data |
| Project → members list | **REST** (lineage-manager) | Simple join on `project_user` table |
| User → projects list | **REST** (lineage-manager) | Simple reverse lookup |
| User → owned jobs list | **REST** (lineage-manager) | Simple join on `job_owner` table |
| User activity dashboard (job count, run stats, failure rates) | **GraphQL** (metrics-manager) | Aggregation across multiple data sources |
| Project overview with performance trends | **GraphQL** (metrics-manager) | Requires BigQuery analytics data |


---

## 5. Graph Initialisation Details

The `POST /api/v2/graph/init` endpoint kicks off a complete rebuild of the lineage graph. It returns immediately with a task identifier; the actual work runs asynchronously via Celery.

### Process Steps

1. **Drop or truncate** existing nodes and edges when `drop_existing=true`
2. **Discover jobs and tables** from the write database, configuration repository, or YAML config store
3. **Parse dependencies** – For each job, parse SQL or dependency definitions to identify upstream tables
4. **Construct edges** – Between jobs and tables (`produces`/`consumes`) and between tables (`dependency` for view definitions)
5. **Persist** – Bulk-insert using SQLAlchemy async session
6. **Publish event** – `GRAPH_INITIALISED` so metrics-manager can refresh projections

### Monitoring Progress

Use `GET /api/v2/graph/status` to poll progress. The UI can display a progress bar using `jobs_processed / total_jobs`.

### Scheduling

- **Nightly run** – Ensures graph reflects the current state
- **On-demand** – Use `POST /api/v2/jobs/sync` for incremental ingestion when individual jobs change

---

## 6. Frontend Integration

### Nginx Routing

```nginx
# Frontend Nginx Configuration
location /api/lineage-manager/ {
    proxy_pass http://lineage-manager-v2:5003/;
}

location /api/metrics-manager/ {
    proxy_pass http://metrics-manager:5004/;
}
```

### Communication Patterns

| Action | Service | Protocol | Example |
|:---|:---|:---|:---|
| Create job | lineage-manager-v2 | REST | `POST /api/v2/jobs` |
| View job DAG | lineage-manager-v2 | REST | `GET /api/v2/lineage/graph?node_id=job:123` |
| Check impact | lineage-manager-v2 | REST | `GET /api/v2/lineage/table/{fqn}/impact` |
| Dashboard metrics | metrics-manager | GraphQL | `query { stats { overview } }` |
| Top N slowest jobs | metrics-manager | GraphQL | `query { performances { topSlotConsumers } }` |

### Event-Driven Updates

See [Section 9: Security & Authorisation – Event Publishing](#event-publishing) for full details.

```
lineage-manager-v2 (Command)
   │
   ├── Create/Update/Archive Job or Graph Sync
   │
   └── Publish Event → Redis Pub/Sub (lineage-events channel)
                              ↓
                    metrics-manager (Query)
                              ↓
                    Update Projection DB
```

---

## 7. Mapping of V1 API to V2 and Metrics-Manager

| V1 Endpoint (api/v1) | Description | V2 REST | Metrics-Manager GraphQL | Notes |
|:---|:---|:---|:---|:---|
| `GET /graph/initialize` | Initialise lineage graph | `POST /api/v2/graph/init` | — | Changed to async POST with Celery; added `drop_existing`, `concurrency`, date range params |
| `GET /graph/health` | Health checks | `GET /api/v2/health` | — | New endpoint |
| `GET /graph/table/{fqn}/dag` | Table DAG traversal | `GET /api/v2/lineage/graph` | — | Consolidated |
| `GET /graph/job/{id}/neighbors` | Job neighbours | `GET /api/v2/lineage/job/{id}/neighbors` | — | Retained |
| `POST /jobs/sync` | Sync lineage for jobs | `POST /api/v2/jobs/sync` | — | Combined and simplified |
| `GET /jobs/{id}/runs` | Job run history | — | `history` domain query | Moved to metrics-manager |
| `POST /jobs` | Create job | `POST /api/v2/jobs` | — | Retained |
| `PUT /jobs/{id}` | Update job | `PUT /api/v2/jobs/{id}` | — | Retained |
| `DELETE /jobs/{id}` | Archive job | `DELETE /api/v2/jobs/{id}` | — | Retained |
| `PATCH /jobs/{id}/resume` | Resume job | `PATCH /api/v2/jobs/{id}/status` | — | Combined into single endpoint |
| `PATCH /jobs/{id}/pause` | Pause job | `PATCH /api/v2/jobs/{id}/status` | — | Combined |
| `GET /tables/{fqn}` | Table details | `GET /api/v2/tables/{fqn}` | — | Retained |
| `GET /tables/{fqn}/impact` | Impact analysis | `GET /api/v2/lineage/table/{fqn}/impact` | — | Retained with depth & include_jobs |
| `GET /tables/{fqn}/hierarchy` | Full upstream/downstream path | **Needs review** | — | Could use repeated `/lineage/graph` calls |
| `PATCH /tables/{fqn}/triggers` | Set table triggers | **Needs review** | — | Out of scope for MVP |
| `GET /tables/{fqn}/load-history` | Load history | — | `history` domain query | Moved to metrics-manager |
| `GET /tables/{fqn}/timelines` | Table timeline | — | `history` domain query | Moved to metrics-manager |
| `GET /search?type=jobs` | Search suggestions | `GET /api/v2/search/jobs` | — | Retained |
| `GET /lineage/graph?node_id=…` | Mermaid/Cytoscape viewer | `GET /api/v2/lineage/graph` | — | Response simplified |
| `POST /graph/search-details` | Batch fetch node details | **Needs review** | — | Might be replaced by metrics-manager |

**Rows marked "Needs review"**: If UI still relies on these, implement in v2 or migrate to metrics-manager. Otherwise, remove.

---

## 8. Impact Analysis and DAG Query Semantics

### DAG Traversal (`/lineage/graph`)

- Returns a **local neighbourhood** (depth 1-2) of nodes and edges
- Used for **interactive expansion** in UI
- Quickly renders subgraphs

### Impact Analysis (`/lineage/table/{fqn}/impact`)

- Traverses a **single direction** (upstream or downstream) to specified depth
- Aggregates impacted jobs and tables
- Returns **flat lists** rather than a graph
- Answers: "What will be broken if I change table X?" or "What feeds into table Y?"

### Limits

Both endpoints enforce:
- Maximum depth
- Maximum node count

Requests exceeding limits return **truncated results** with a warning flag.

---

## 9. Security & Authorisation

### JWT-Based Authentication

- **JWT verification** occurs at ingress/API gateway
- FastAPI middleware decodes `X-Authenticated-User` header
- Extracts `user_id` and `scope` (e.g., `viewer`, `editor`, `admin`)

### Scope Enforcement

| Scope | Allowed Actions |
|:---|:---|
| `viewer` | GET endpoints (read-only) |
| `editor` | CRUD operations (create, update, pause/resume) |
| `admin` | All operations + audit log access |

**Insufficient scope**: Returns `HTTP 403 Forbidden`.

### Rate Limiting

- **Per-user limit**: 100 requests per minute
- **Global fallback**: Prevents abuse
- **Implementation**: Redis token bucket
- **Exceeded limit**: Returns `HTTP 429 Too Many Requests`

### Audit Logging

Records user actions in `audit_logs` table:
- `user_id`
- `action` (create_job, update_job, pause_job, etc.)
- `target_id` / `target_type`
- `timestamp`

**Access**: `GET /api/v2/audit` (admin only)

### Event Publishing

- **Channel**: `lineage-events` (Redis Pub/Sub)
- **Events**: Job/graph changes with metadata
- **Consumer**: metrics-manager updates projections
- **Benefit**: Decouples services, prevents synchronous coupling

---

## 10. Testing Strategy and Observability

### Unit Tests

- **Framework**: pytest with pytest-asyncio
- **Coverage**: All domain entities and services
- **Business rules**: Custom exceptions tested individually (e.g., pausing archived job)

**Example**:
```python
def test_cannot_pause_archived_job():
    job = Job(..., status="archived")
    with pytest.raises(ValueError, match="Cannot pause archived job"):
        job.pause()
```

### Integration Tests

- **Repositories**: Tested against MySQL test container with async session
- **Endpoints**: Tested via HTTP calls using `TestClient`

### Graph Initialisation Tests

- **Fixtures**: Load sample job configurations
- **Verification**: Nodes and edges built correctly

### Observability

#### Logging Middleware

- Injects **request ID** into each response
- Logs request/response metadata (method, path, status, duration)

#### Metrics

- **Prometheus export**: Request count, latency, error rate
- **Health endpoint**: `GET /api/v2/health` returns service status and DB connectivity

**Example Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "2.0.0",
  "uptime_seconds": 86400
}
```

---

## 11. Migration and Cut-Over Strategy (Strangler Fig)

### Phase 1: Foundation (Weeks 1-2)

- ☐ Set up v2 project structure
- ☐ Implement core domain entities
- ☐ Configure async DB, DI container, event publisher
- ☐ Add health and version endpoints

### Phase 2: Core Features (Weeks 3-4)

- ☐ Implement job and table CRUD endpoints
- ☐ Implement graph initialisation and incremental sync
- ☐ Implement DAG traversal and impact analysis endpoints
- ☐ Publish events to metrics-manager

### Phase 3: Metrics-Manager Integration (Week 5)

- ☐ Deploy metrics-manager GraphQL service
- ☐ Implement queries for dashboards and lists
- ☐ Verify event propagation from lineage-manager

### Phase 4: UI Refactoring (Weeks 6-7)

- ☐ Update AdminConsole to call v2 endpoints
- ☐ Use `/lineage/graph` for DAG rendering
- ☐ Use `/lineage/table/{fqn}/impact` for impact analysis
- ☐ Integrate metrics-manager GraphQL queries

### Phase 5: Cut-Over and Decommissioning (Week 8)

- ☐ Route `/api/lineage-manager` to v2
- ☐ Keep v1 behind alternate path for fallback
- ☐ Monitor errors and performance
- ☐ After stabilisation, retire v1 codebase
- ☐ Update documentation

---

## 12. Project Structure (DDD)

```
lineage_manager_v2/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── core/                      # Cross-cutting concerns
│   │   ├── config.py              # Environment configuration
│   │   ├── container.py           # DI Container
│   │   ├── database.py            # Async DB engine setup
│   │   ├── middleware.py          # Auth, Logging, CORS, Rate Limiting
│   │   └── events.py              # Event publisher
│   │
│   ├── api/                       # Presentation Layer (REST)
│   │   ├── deps.py                # FastAPI dependencies
│   │   └── v2/
│   │       ├── endpoints/
│   │       │   ├── jobs.py        # Job CRUD endpoints
│   │       │   ├── tables.py      # Table CRUD endpoints
│   │       │   ├── graph.py       # Graph init/sync endpoints
│   │       │   ├── lineage.py     # DAG traversal & impact analysis
│   │       │   ├── search.py      # Search & autocomplete
│   │       │   └── health.py      # Health & diagnostics
│   │       └── schemas/           # Pydantic request/response models
│   │
│   ├── domain/                    # Domain Layer (Business Logic)
│   │   ├── graph/
│   │   │   ├── entities.py        # Job, Table, Edge entities
│   │   │   ├── services.py        # Graph sync logic
│   │   │   ├── repository.py      # Graph data access interface
│   │   │   └── events.py          # Domain events
│   │   │
│   │   ├── audit/
│   │   │   ├── entities.py        # AuditLog entity
│   │   │   ├── services.py        # Audit recording logic
│   │   │   └── repository.py
│   │   │
│   │   └── user/
│   │       ├── entities.py        # User entity (maps to user_account)
│   │       ├── services.py
│   │       └── repository.py
│   │
│   ├── infrastructure/            # Infrastructure Layer
│   │   ├── persistence/
│   │   │   ├── models.py          # SQLAlchemy models
│   │   │   ├── repositories/      # Concrete repository implementations
│   │   │   │   ├── graph_repo.py
│   │   │   │   ├── audit_repo.py
│   │   │   │   └── user_repo.py
│   │   │   └── uow.py             # Unit of Work implementation
│   │   │
│   │   ├── cache/
│   │   │   └── redis_client.py
│   │   │
│   │   └── external/
│   │       └── metrics_publisher.py  # Event publishing to metrics-manager
│   │
│   └── orchestration/             # Application Layer (Use Cases)
│       ├── commands/              # Command handlers
│       │   ├── create_job.py
│       │   ├── update_job.py
│       │   ├── sync_graph.py
│       │   └── record_audit.py
│       └── queries/               # Simple read queries (if needed)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── alembic/                       # Database migrations
│   ├── versions/
│   └── env.py
│
├── deploy/
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── supervisord.conf
│   └── helm/
│
├── pyproject.toml
├── Makefile
└── .env.example
```

---

## 13. Environment Configuration

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Service
    SERVICE_NAME: str = "lineage-manager-v2"
    PORT: int = 5003
    ENVIRONMENT: str = "development"
    
    # Database (Async)
    DATABASE_URL: str  # mysql+aiomysql://user:pass@host:3306/lineage_db
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False  # SQL logging
    
    # Redis
    REDIS_URL: str  # redis://localhost:6379/0
    REDIS_MAX_CONNECTIONS: int = 50
    
    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    
    # API Limits
    MAX_REQUEST_SIZE_MB: int = 10
    REQUEST_TIMEOUT_SEC: int = 30
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Event Publishing
    EVENT_BROKER_URL: str  # For metrics-manager sync
    ENABLE_EVENT_PUBLISHING: bool = True
    
    # Graph Traversal Limits
    MAX_GRAPH_DEPTH: int = 2
    MAX_GRAPH_NODES: int = 1000
    
    # Observability
    LOG_LEVEL: str = "INFO"
    ENABLE_REQUEST_LOGGING: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## 14. Key Differences from metrics-manager

| Aspect | lineage-manager-v2 | metrics-manager |
|:---|:---|:---|
| **Purpose** | Command Side (Write) | Query Side (Read) |
| **Protocol** | REST | GraphQL |
| **Database** | MySQL (Write DB) | BigQuery (Analytics) + Projection DB |
| **Pattern** | DDD + UoW | CQRS Queries + DataLoaders |
| **Transactions** | Explicit (UoW) | None (Read-only) |
| **Events** | Publishes events | Consumes events |
| **Caching** | Minimal (Redis for rate limiting) | Heavy (Redis for query results) |
| **Complexity** | High (Business logic) | Medium (Aggregations) |
| **Resource Grouping** | Project-based (1:N jobs, N:N users) | Project-based |

---

## 16. Coding Guidelines (DDD, DI, & UoW Patterns)

To maintain consistency and testability, following code patterns must be strictly followed in V2.

### 16.1 Domain Separation (Graph vs. Metadata)

- **Graph Domain (`app/domain/graph`)**: Focuses solely on **connectivity and relationships**. Entities like `JobNode`, `DataNode`, and `Edge` should only contain attributes necessary for graph traversal.
- **Metadata Domain (`app/domain/metadata`)**: Focuses on **rich attributes**. Entities like `TableMetadata` and `StorageMetadata` store schemas, paths, and technical details.
- **Reference Pattern**: Graph nodes link to metadata via a shared `id` or a business key (`external_ref`).

### 16.2 Dependency Injection (DI)

We use `dependency-injector` for managing service lifecycles.

- **Container Definition**: All providers are defined in `app/core/container.py`.
- **API Injection**: Use `@inject` and `Provide` decorators in FastAPI endpoints.
  
```python
@router.post("/")
@inject
async def create_job(
    data: JobCreate, 
    service: MetadataService = Depends(Provide[Container.metadata_service])
):
    return await service.create_job(data)
```

### 16.3 Service Layer & Transaction Management

- **Business Logic Placement**: All business rules and cross-aggregate operations MUST reside in Service classes (`app/services/`).
- **Unit of Work (UoW)**: Services use the UoW to guarantee atomicity. Every write operation must be wrapped in `async with self.uow:`.

```python
class MetadataService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_job(self, job: Job) -> Job:
        async with self.uow:
            saved = await self.uow.jobs.save(job)
            await self.uow.commit() # Explicit commit
            return saved
```

### 16.4 Repository Pattern

- **Aggregate per Repository**: Each repository manages one aggregate root.
- **Entity Mapping**: Repositories are responsible for mapping between SQLAlchemy ORM models and pure Domain Entities.
- **Session Handling**: Repositories must not close the session; the UoW manages the session lifecycle.

### 16.5 Testing Patterns

- **Provider Overriding**: In `conftest.py`, override the `uow` provider to inject a test session (e.g., in-memory SQLite).
- **Service Mocking**: For complex integration tests, services can be mocked at the container level to isolate failures.

---

## 17. Conclusion

Lineage-manager-v2 rethinks the command side of the lineage platform:

✅ **Clean, asynchronous architecture**  
✅ **Clean Project/Job/User relationship model**  
✅ **Delegates analytics to metrics-manager**  
✅ **Keeps essential DAG and impact queries in REST**  
✅ **Shifts dashboard-style queries to GraphQL**  

The design strikes a balance between **performance and flexibility**. A clear mapping of v1 functionalities to v2 and metrics-manager ensures nothing is lost.

**Future enhancements** (table triggers, extended audit reports) can be added incrementally without polluting the core domain.

---

_Author: Antigravity (Capsule Corp)_  
_Date: 2026-02-14_  
_Version: 2.1 (Revised with Coding Guidelines)_

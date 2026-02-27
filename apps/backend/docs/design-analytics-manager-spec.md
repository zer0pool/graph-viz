# [Design] Analytics-Manager Specification (Query Side)

> **Document Metadata**
> - **Version**: 1.0.0
> - **Last Updated**: 2026-02-14
> - **Status**: Active Specifications


This document provides a detailed technical specification for the `analytics-manager` service, designed as a dedicated Query-Side service using FastAPI, GraphQL (Strawberry), DDD, and CQRS.

---

## 1. Why GraphQL for analytics-manager?
Metrics services have specific characteristics that make GraphQL a superior choice over REST:
- **Widget-based UI**: Different dashboard widgets require different subsets of fields.
- **Dynamic Requirements**: Different screens often need variations of the same metrics.
- **Nested Structures**: Hierarchical data (e.g., Projects → Jobs → Executions) is common.
- **Complex Aggregations**: Supports varied group-by requests without multiple REST endpoints.

---

## 1.1 API Gateway & Routing Strategy

The frontend container uses **Nginx** as a reverse proxy to route API requests to the appropriate backend service.

### Routing Rules

| Path Pattern | Target Service | Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/analytics-manager/*` | `analytics-manager:5004` | GraphQL | Analytics, Metrics, Aggregations |
| `/api/lineage-manager/*` | `lineage-manager:5003` | REST | Commands, CRUD, Metadata Operations |
| `/health` | Both (via Nginx health check) | HTTP | Service health monitoring |

**Note**: Service-based routing provides clear separation and allows each service to use any protocol (REST/GraphQL) independently.

### Nginx Configuration (`apps/frontend/container/nginx.conf`)

```nginx
upstream lineage_manager {
    server lineage-manager:5003;
}

upstream analytics_manager {
    server analytics-manager:5004;
}

server {
    listen 80;
    
    # Analytics Manager (GraphQL Analytics)
    location /api/analytics-manager/ {
        proxy_pass http://analytics_manager/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;
        
        # GraphQL-specific settings
        proxy_read_timeout 30s;
        client_max_body_size 50k;
    }
    
    # Lineage Manager (REST API)
    location /api/lineage-manager/ {
        proxy_pass http://lineage_manager/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;
    }
    
    # Static Assets (MFEs)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Frontend API Client Strategy

```typescript
// apps/frontend/src/api/client.ts

// GraphQL Client (Analytics & Insights)
const analyticsClient = new GraphQLClient('/api/analytics-manager/graphql', {
  headers: {
    'Content-Type': 'application/json',
  },
});

// REST Client (Commands & Metadata)
const lineageClient = axios.create({
  baseURL: '/api/lineage-manager',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Usage Example
// For metrics: metricsClient.request(OVERVIEW_QUERY)
// For commands: lineageClient.post('/jobs', jobData)
```

### Decision Rationale

- **Service-based Routing**: Clear ownership, each service can evolve independently (e.g., lineage-manager could add GraphQL later).
- **Single Origin**: Avoids CORS complexity, all requests go through same domain.
- **Monitoring-friendly**: Logs and metrics can easily filter by service name in the path.
- **Future-proof**: Easy to add new services (e.g., `/api/ai-advisor/`) without changing routing logic.


---

## 2. Overall Architecture
```mermaid
flowchart TD

Frontend[Browser MFEs] -->|GraphQL| API[FastAPI GraphQL]
API -->|Context| Resolver
Resolver -->|Execute| QueryService
QueryService -->|Check| Cache[Redis]
QueryService -->|Fact Data| BQ[BigQuery]
QueryService -->|Metadata| RDB[(MySQL Projection)]
QueryService -->|Enrichment| LAPI[Lineage API]
```

---

### 2.1 Technical Sequence: Data Enrichment Flow
This diagram illustrates how BigQuery facts are enriched with human-readable metadata using DataLoaders.

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend (MFE)
    participant GQL as GraphQL Engine
    participant QS as Query Service
    participant RD as Redis Cache
    participant BQ as BigQuery (Fact)
    participant DL as DataLoader
    participant LAPI as lineage-manager (API)

    FE->>GQL: Query topJobs { id, name, slotUsage }
    GQL->>QS: execute(GetTopJobsQuery)
    QS->>RD: Get cache (key: metrics:tenant:top_jobs)
    RD-->>QS: Cache Miss
    QS->>BQ: Fetch Top 30 IDs & Slot Stats
    BQ-->>QS: Return [{id: 'uuid-1', slotUsage: 5000}, ...]
    
    loop Per Job ID
        GQL->>DL: load_metadata(id)
    end
    
    Note over DL: Wait for next tick (Batching)
    
    DL->>LAPI: POST /api/v1/jobs/batch {ids: [...]}
    LAPI-->>DL: Return {id: {name: 'Data Job A', owner: 'John'}, ...}
    
    QS->>GQL: Map Fact Data + Metadata
    GQL->>FE: Return JSON Response
```




## 3. Tech Stack
- **Framework**: FastAPI (strawberry-graphql >= 0.200)
- **GraphQL**: Strawberry GraphQL
- **DTO/Validation**: Pydantic v2
- **Caching**: Redis
- **Infra**: BigQuery Client (Singleton), SQLAlchemy (for Metadata Projections)
- **HTTP Client**: HTTPX (Singleton with Connection Pooling)

### 3.1 Environment Configuration (`app/core/config.py`)

All runtime configuration is managed through environment variables for 12-factor app compliance.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Service
    SERVICE_NAME: str = "analytics-manager"
    PORT: int = 5004
    
    # Database (Projection)
    PROJECTION_DB_URL: str  # mysql+pymysql://user:pass@host:3306/metrics_projection
    PROJECTION_DB_POOL_SIZE: int = 10
    PROJECTION_DB_MAX_OVERFLOW: int = 20
    
    # BigQuery
    BQ_PROJECT_ID: str
    BQ_DATASET: str = "lineage_analytics"
    BQ_CREDENTIALS_PATH: str = "/secrets/bq-key.json"
    BQ_QUERY_TIMEOUT_SEC: int = 25
    
    # Redis
    REDIS_URL: str  # redis://localhost:6379/0
    REDIS_MAX_CONNECTIONS: int = 50
    
    # Lineage API (Batch Endpoints)
    LINEAGE_API_BASE_URL: str  # http://lineage-manager:5003
    LINEAGE_API_TIMEOUT: int = 5
    LINEAGE_API_MAX_CONNECTIONS: int = 20
    
    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    
    # Guardrails
    MAX_QUERY_DEPTH: int = 8
    MAX_QUERY_COMPLEXITY: int = 500
    MAX_REQUEST_SIZE_KB: int = 50
    REQUEST_TIMEOUT_SEC: int = 30
    
    # Cache TTL (seconds)
    CACHE_TTL_REALTIME: int = 300      # 5 mins
    CACHE_TTL_ANALYTICS: int = 7200    # 2 hours
    CACHE_TTL_METADATA: int = 3600     # 1 hour
    
    # Celery (Background Tasks)
    CELERY_BROKER_URL: str  # redis://localhost:6379/1
    CELERY_RESULT_BACKEND: str
    
    # Observability
    LOG_LEVEL: str = "INFO"
    ENABLE_QUERY_LOGGING: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 3.2 BigQuery Query Templates (`app/infrastructure/bigquery/queries.py`)

All analytical queries are centralized for maintainability and cost tracking.

```python
# TBD: Actual SQL queries to be finalized after BigQuery schema review

# Top Slot Consumers
TOP_SLOT_CONSUMERS_QUERY = """
-- TBD: Query to fetch top 30 jobs by slot usage
-- Expected columns: job_id, total_slot_ms, avg_slot_ms, execution_count
-- Filters: tenant_id, date_range
-- ORDER BY total_slot_ms DESC LIMIT 30
"""

# Top Long Running Jobs
TOP_LONG_RUNNING_QUERY = """
-- TBD: Query to fetch top 30 jobs by execution duration
-- Expected columns: job_id, avg_duration_ms, max_duration_ms, execution_count
-- Filters: tenant_id, date_range
-- ORDER BY avg_duration_ms DESC LIMIT 30
"""

# Daily Job Execution Stats
DAILY_EXECUTION_STATS_QUERY = """
-- TBD: Query to fetch daily aggregated stats
-- Expected columns: date, total_runs, success_count, failure_count, avg_duration
-- Filters: tenant_id, date_range
-- GROUP BY date ORDER BY date DESC
"""

# Job Run History
JOB_RUN_HISTORY_QUERY = """
-- TBD: Query to fetch execution history for a specific job
-- Expected columns: run_id, start_time, end_time, status, duration_ms, slot_usage
-- Filters: job_id, tenant_id, date_range
-- ORDER BY start_time DESC LIMIT 100
"""
```

**Note**: All queries MUST include `tenant_id` filtering and use parameterized queries to prevent SQL injection.



## 4. Project Structure

### 4.1 Application Source Structure (`/app`)
Focuses on DDD/CQRS implementation.

```text
app/
├── main.py               # App entry point & Container Wire
├── celery_app.py         # Celery worker/beat configuration
├── core/                 # Global configuration & DI Container
│   ├── config.py
│   ├── container.py      # Multi-Container DI Management
│   ├── logging.py
│   └── middleware.py     # Request-ID, Body Size, Auth
├── api/                  # Presentation Layer
│   └── graphql/          # GraphQL Implementation
│       ├── schema.py
│       ├── types.py      # Enums, Scalars, Object Types
│       ├── resolvers/    # Sub-Resolvers (Stats, Performance)
│       ├── context.py    # Request-scoped data & Loaders
│       ├── dataloaders.py # N+1 Prevention
│       └── extensions.py  # Guardrails (Depth/Complexity)
├── application/          # Application Layer (CQRS Queries)
│   └── queries/          # Orchestration by Subdomain
├── domain/               # Domain Layer (Business Logic)
│   ├── stats/            # rules.py (Calcs, formatting)
│   ├── performances/     # normalization.py
│   └── history/
└── infrastructure/       # External systems (Singletons)
    ├── bigquery/         # Singleton BQ Client
    ├── redis/            # Redis Pool
    ├── lineage_api/      # Batch-aware HTTP Client
    └── projection/       # SQLAlchemy Session (Shared MySQL / Separate Schema)
```

### 4.2 Project & Deployment Structure (Root)
```text
analytics-manager/:
├── app/                  # (See 4.1 above)
├── tests/                # Unit & Integration tests
├── deploy/               # Deployment artifacts (Docker, Helm)
├── Makefile              # Local dev commands
├── pyproject.toml        # Dependency management
└── .env.example          # Environment template
```

---

## 5. GraphQL Schema Design

### 5.1 Enums & Statuses
```python
import strawberry
from enum import Enum

@strawberry.enum
class MetricKey(Enum):
    TOTAL_JOBS = "total_jobs"
    TOTAL_TABLES = "total_tables"
    TOTAL_USERS = "total_users"
    DAILY_INGESTION = "daily_ingestion"

@strawberry.enum
class MetricStatus(Enum):
    DEFAULT = "default"
    WARNING = "warning"
    CRITICAL = "critical"

@strawberry.enum
class Period(Enum):
    P7D = "7d"
    P30D = "30d"
    P90D = "90d"
```

### 5.2 Type Definitions (`app/api/graphql/types.py`)
```python
from datetime import datetime, date
from typing import List

@strawberry.type
class MetricItemType:
    key: MetricKey
    value: float            # Raw numeric value
    formatted_value: str    # UI-friendly (e.g., '3.4k')
    subtext: str
    status: MetricStatus = MetricStatus.DEFAULT
    breakdown: List[BreakdownType] = strawberry.field(default_factory=list)

@strawberry.type
class OverviewType:
    metrics: List[MetricItemType]
    generated_at: datetime
    cache_ttl_sec: int
```

---

## 6. Resolver & Sub-Resolver Structure
We use a delegated root resolver to keep logic modular.

```python
# app/api/graphql/resolvers/stats.py
class StatsResolver:
    async def overview(self, info, target_date: date) -> OverviewType:
        container = info.context["container"]
        query = container.queries.get_overview()
        return await query.execute(target_date)

# app/api/graphql/schema.py
@strawberry.type
class Query:
    @strawberry.field
    async def stats(self) -> StatsResolver:
        return StatsResolver()
```

---

## 7. Dependency Injection (Multi-Container)
```python
# app/core/container.py
class InfrastructureContainer(containers.DeclarativeContainer):
    bq_client = providers.Singleton(BigQueryClient)
    cache = providers.Singleton(RedisClient)
    lineage = providers.Singleton(LineageClient)

class AppContainer(containers.DeclarativeContainer):
    infra = providers.Container(InfrastructureContainer)
    # Map use cases to factories
    get_overview = providers.Factory(GetOverviewQuery, repo=infra.bq_client, cache=infra.cache)
```

---

## 8. Startup & Context Integration
```python
# app/main.py
@app.on_event("startup")
async def startup():
    app.state.container = AppContainer()

async def get_context(request: Request):
    container = request.app.state.container
    return {
        "container": container,
        "loaders": build_dataloaders(container.infra.lineage()),
        "user_scope": request.state.auth_user.scope
    }

router = GraphQLRouter(schema, context_getter=get_context)
```

---

## 9. Operational Guardrails

| Guardrail | Value | Enforcement Point |
| :--- | :--- | :--- |
| **Max Depth** | 8 | Strawberry `MaxDepthRule` |
| **Max Complexity** | 500 | Strawberry `QueryComplexityRule` |
| **Max Query Size** | 50KB | FastAPI Middleware |
| **Request Timeout**| 30s | FastAPI Middleware / Gunicorn |
| **BQ Timeout** | 25s | BQ Job Config |
| **Upstream Timeout**| 5s | HTTPX Singleton Settings |

---

## 10. Data Strategy (The Three Pillars)

| Source | Role | Nature | Refresh |
| :--- | :--- | :--- | :--- |
| **BigQuery** | Fact Source | Historical logs, resource usage facts. | Batch/Streaming |
| **Metadata Projection** | Metadata Sync | Snapshot of Job names, owners, deps. Logical schema `metrics_projection`. | Event-driven (Shared MySQL) |
| **Redis** | Speed Layer | Pre-aggregated results & Page views. | TTL-based |

### 10.1 Projection Schema Design (`metrics_projection`)

To ensure ultra-fast metadata lookups without overloading the primary write DB.

#### Table: `job_metadata_projection`
| Field | Type | Note |
| :--- | :--- | :--- |
| **job_id** | UUID (PK) | Primary Key derived from Lineage |
| **tenant_id** | VARCHAR(50) | Mandatory for Multi-tenancy isolation |
| **project_id** | VARCHAR(50) | Scope filtering |
| **name** | VARCHAR(255) | Display Name |
| **owner_id** | UUID | Reference to User Projection |
| **updated_at** | TIMESTAMP | Last sync timestamp from Lineage-Manager |

#### Sync Policy
- **Trigger**: `lineage-manager` emits a `JOB_CREATED` or `JOB_UPDATED` event (via Message Broker or internal signal).
- **Update**: `analytics-manager` worker performs an **UPSERT** on the projection table.
- **Goal**: Latency between Write -> Projection should be < 1 second.

#### ⚠️ IMPLEMENTATION DECISION REQUIRED (Before Development Starts)

**Question**: How will `analytics-manager` receive updates from `lineage-manager`?

**Options**:

| Option | Mechanism | Pros | Cons | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **A. Polling** | Celery Beat queries `lineage-manager` API every N seconds | Simple, no infra changes | Higher latency (5-30s), API load | Low |
| **B. Webhook** | `lineage-manager` POSTs to `analytics-manager` endpoint | Real-time, low latency | Coupling, retry logic needed | Medium |
| **C. Message Queue** | Kafka/RabbitMQ event streaming | Decoupled, scalable, reliable | New infrastructure, operational overhead | High |

**Recommendation**: 
- **Phase 1 (MVP)**: Option A (Polling every 10 seconds)
- **Phase 2 (Production)**: Option C (Message Queue with Kafka)

**Action Required**: Confirm sync mechanism before writing `app/infrastructure/projection/sync.py`.


## 11. Batch Fetching Details (Lineage-Manager Contract)

To prevent the N+1 problem, `lineage-manager` MUST provide the following batch interface.

### endpoint: `POST /api/v1/jobs/batch`
**Request Body**:
```json
{
  "ids": ["550e8400-e29b-41d4-a716-446655440000", "..."],
  "fields": ["name", "owner_id", "project_info"]
}
```

**Response Body**:
```json
{
  "data": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "name": "ETL_Production_Job",
      "owner_id": "991e...",
      "status": "active"
    }
  }
}
```
*Note: Missing IDs should be omitted from the dictionary, not returned as null.*

---

## 12. Application Query Example
```python
# app/application/queries/stats/get_overview.py
class GetOverviewQuery:
    async def execute(self, target_date: date):
        cache_key = f"stats:overview:{target_date.isoformat()}"
        cached = await self.cache.get(cache_key)
        if cached: return cached
        
        # 1. Fetch from BQ/RDB
        # 2. Apply Domain Rules
        # 3. Cache & Return

## 12.1 Domain Calculation Rules (`app/domain/stats/rules.py`)

Detailed logic for metric derivation, ensuring consistency across all MFEs.

#### 1. Success Rate (%)
- **Formula**: `(Success_Count / Valid_Runs) * 100`
- **Valid_Runs**: `Success + Failure + Cancelled`
- **Exclusion**: Currently `Running` or `Pending` jobs are EXCLUDED from both denominator and numerator to avoid skewing rates during heavy workloads.
- **Rounding**: 2 decimal places (e.g., 99.45%).

#### 2. Slot Cost Estimation ($)
- **Formula**: `(Total_Slot_MS / 1000 / 3600) * UNIT_PRICE`
- **UNIT_PRICE**: Default to `$0.04` per slot-hour (Based on BigQuery standard pricing).
- **Currency**: USD (Raw) -> Formatted string with `$` prefix in `formatted_value`.

#### 3. Execution Duration Normalization
- **Logic**: Convert BigQuery `duration_ms` to `HH:MM:SS` or `Xm Ys` based on the magnitude.
- **Threshold**: Values < 1s are displayed as `ms`.
```

---

## 13. CQRS Layer Breakdown
| Layer | Responsibility |
| :--- | :--- |
| **FastAPI** | Middleware, Auth, DI Initializer |
| **GraphQL API** | Request Parsing, Guardrails, DataLoaders |
| **Query Handler** | Orchestration, Caching Logic |
| **Domain Logic** | Calculations, Normalization, Formatting |
| **Infrastructure**| Singleton Clients, BQ SQL, Redis Commands |

---

## 14. AuthN / AuthZ & Scoping
- **Auth**: Ingress-level JWT check + `X-Authenticated-User` header.
- **Scoping**: All queries must include `WHERE tenant_id = :tenant`.
- **Cache Isolation**: Keys prefixed with `metrics:{tenant}:{scope}:`.

---

## 15. Error Handling Standards
- **BAD_USER_INPUT**: Invalid input parameters (400)
- **UNAUTHORIZED**: Unauthorized access (401)
- **UPSTREAM_ERROR**: Upstream API failure (502)
- **BQ_QUERY_FAILED**: BigQuery query execution failed (500)
- **INTERNAL**: Internal business logic error (500)

---

## 16. Observability
- **Request-ID**: Included in all logs and response headers.
- **JSON Logging**: Cloud-friendly structured logging.
- **Query Labeling**: Attach `analytics-manager` service label to BQ queries.

---

## 17. Schema & Release Policy
- **Stability**: Breaking changes strictly prohibited. Use `@strawberry.field(deprecation_reason=...)`.
- **Contract**: Schema snapshot testing in CI.

---

## 18. Caching Strategy
- **Key Pattern**: `metrics:{tenant}:{scope}:{metric_name}:{param_hash}`
- **TTL**: Real-time(5m), Analytics(2h), Metadata(1h).

---

## 18.1 API Exploration & Testing (GraphQL Playground)

Unlike REST APIs with Swagger, GraphQL provides **built-in, interactive documentation** through its introspection system.

### GraphiQL Interface (Built-in)

Strawberry GraphQL automatically provides **GraphiQL** - an in-browser IDE for exploring and testing the API.

```python
# app/main.py
from strawberry.fastapi import GraphQLRouter

graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    graphiql=True  # Enable in development
)

app.include_router(graphql_router, prefix="/api/analytics-manager")
```

**Access**: `http://localhost:5004/api/analytics-manager/graphql`

### Key Features

| Feature | Description | Equivalent in Swagger |
|:---|:---|:---|
| **Auto-completion** | Type-aware suggestions as you type | Request body schema hints |
| **Schema Explorer** | Browse all types, fields, and descriptions | Swagger UI schema viewer |
| **Query Execution** | Run queries with variables in real-time | "Try it out" button |
| **Query History** | Save and replay previous queries | N/A |
| **Documentation** | Auto-generated from schema docstrings | Swagger annotations |

### Example Usage

```graphql
# Query with auto-completion
query GetOverview($date: Date!) {
  stats {
    overview(targetDate: $date) {
      metrics {
        key
        value
        formattedValue
        status
      }
      generatedAt
    }
  }
}

# Variables (JSON)
{
  "date": "2024-02-14"
}
```

### Schema Introspection

GraphQL schemas are **self-documenting**. You can query the schema itself:

```graphql
# Get all available types
query IntrospectionQuery {
  __schema {
    types {
      name
      description
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

### Production Considerations

```python
# Disable GraphiQL in production
graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    graphiql=settings.ENVIRONMENT == "development"  # Only in dev
)
```

### Alternative Tools

| Tool | Purpose | Installation |
|:---|:---|:---|
| **GraphQL Playground** | Enhanced UI with tabs, themes | Standalone app |
| **Insomnia** | API client with GraphQL support | Desktop app |
| **Postman** | API testing with GraphQL queries | Desktop/Web app |
| **GraphQL Voyager** | Visual schema explorer (graph view) | `npm install -g graphql-voyager` |

### Schema Export for CI/CD

```bash
# Export schema for contract testing
strawberry export-schema app.api.graphql.schema:schema > schema.graphql
```

This exported schema can be used for:
- **Contract Testing**: Ensure no breaking changes
- **Code Generation**: Generate TypeScript types for frontend
- **Documentation**: Publish to team wiki


---

## 19. High Availability & Background Tasks

### 19.1 Deployment Architecture

To ensure high availability while preventing duplicate scheduled tasks, we use **Redis-based Leader Election** for Celery Beat.

**For detailed implementation guide, see**: [`tech-celery-beat-leader-election.md`](./tech-celery-beat-leader-election.md)

#### Architecture Overview

```
┌─────────────────────────────────────┐
│  analytics-manager Pod (Replica 1)   │
│  - FastAPI (Port 5004)              │
│  - Celery Worker                    │
│  - Celery Beat (Leader) ✓           │  ← Holds Redis Lock
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  analytics-manager Pod (Replica 2)   │
│  - FastAPI (Port 5004)              │
│  - Celery Worker                    │
│  - Celery Beat (Standby) ✗          │  ← Waiting for leadership
└─────────────────────────────────────┘
```

**Key Characteristics**:
- **Failover Time**: Maximum 25 seconds (TTL 20s + Check Interval 5s)
- **No Duplication**: Only one Beat instance active at any time
- **Auto-Recovery**: Standby pods automatically take over if leader crashes

### 19.2 Scheduled Tasks (Cache Warming)

```python
# app/celery_app.py
from celery import Celery
from celery.schedules import crontab

celery_app = Celery("analytics_worker", broker=settings.REDIS_URL)

celery_app.conf.beat_schedule = {
    # Warm popular queries every 5 minutes
    "warm-overview-cache": {
        "task": "app.tasks.warm_overview",
        "schedule": 300.0,
    },
    
    # Warm top slot consumers every 10 minutes
    "warm-top-slots": {
        "task": "app.tasks.warm_top_slots",
        "schedule": 600.0,
    },
    
    # Check BigQuery cost daily at 1 AM
    "check-bq-cost": {
        "task": "app.tasks.check_bigquery_cost",
        "schedule": crontab(hour=1, minute=0),
    },
}
```

### 19.3 Task Implementation

```python
# app/tasks.py
from app.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)

@celery_app.task
def warm_overview():
    """Pre-compute overview metrics for active tenants"""
    from app.application.queries.stats.get_overview import GetOverviewQuery
    from datetime import date
    
    query = GetOverviewQuery()
    for tenant_id in get_active_tenants():
        try:
            result = query.execute(tenant_id, date.today())
            logger.info(f"Warmed overview cache for tenant: {tenant_id}")
        except Exception as e:
            logger.error(f"Cache warming failed for {tenant_id}: {e}")

@celery_app.task
def check_bigquery_cost():
    """Monitor BigQuery cost and disable warming if over budget"""
    # TBD: Implement cost check via Cloud Billing API
    pass
```

### 19.4 Deployment Configuration

#### Supervisor Config (`deploy/docker/supervisord.conf`)

```ini
[supervisord]
nodaemon=true

[program:api]
command=uvicorn app.main:app --host 0.0.0.0 --port 5004 --workers 2
autostart=true
autorestart=true

[program:celery_worker]
command=celery -A app.celery_app worker --loglevel=info --concurrency=2
autostart=true
autorestart=true
```

**Note**: Celery Beat is managed by the Leader Election module (see linked document above).

#### Helm Values

```yaml
replicaCount: 3

resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```


---

## 20. Provided Metrics Inventory

### 20.1 Stats Domain
| Metric | Description |
| :--- | :--- |
| **Total Jobs** | Registered jobs (w/ SELF/REQUEST breakdown) |
| **Total Tables** | Managed tables count |
| **Total Users** | Active users count |

### 20.2 Performances Domain
| Metric | Description |
| :--- | :--- |
| **Top 30 Slot Consumers** | Highest BQ slot usage jobs |
| **Top 30 Long Running** | Highest duration jobs |

### 20.3 History Domain
| Metric | Description |
| :--- | :--- |
| **Job Run History** | Improved history logs |
| **Daily Run Count** | Execution trend (counts/day) |

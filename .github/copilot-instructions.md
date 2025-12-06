# AI Coding Agent Instructions

## Project: Lineage Manager (Graph-based Data Pipeline Visualization)

### Architecture Overview

This is a **FastAPI-based graph visualization service** for analyzing job and table dependencies in data pipelines. It uses a **DAG (Directed Acyclic Graph)** stored with **closure tables** for efficient neighbor traversal.

**Key architectural decision**: Service layer is split into **two complementary facades**:
- `GraphService` (write-oriented): manages job registration, graph modification, sync operations
- `GraphQueryService` (read-oriented): handles neighbor/DAG queries with optional Redis caching
- Both share the same repository set via `GraphUnitOfWork` pattern (DDD-inspired)

### Core Tech Stack
- **Backend**: FastAPI + SQLAlchemy ORM (MySQL/PostgreSQL)
- **DI Container**: `dependency-injector` (v4.44.0 for Python 3.12+)
- **Caching**: Redis (optional, configured via `REDIS_ENABLED`)
- **Database Migrations**: Alembic (use `alembic revision --autogenerate`)
- **Frontend**: Vanilla JS with Cytoscape.js for graph rendering

---

## Critical Workflows

### Local Development Setup
```bash
make venv                # Create venv + install deps
make install-dev        # Add black, pytest, pytest-cov, flake8
make run                 # Start server on :5003 with reload
make test                # Run pytest with coverage
make format              # Black auto-format
make lint                # Flake8 checks
make compose-up          # Docker Compose dev stack
```

### Database Operations
- **Alembic migrations**: `alembic revision --autogenerate -m "description"` → `alembic upgrade head`
- **Models** in `src/lineage_manager/models/`: always import in `core/database.py` to register with Base.metadata
- **Session Management**: Use `GraphUnitOfWork` context manager or container-injected sessions; middleware auto-commits

### Testing & CI
- Tests in `tests/` directory (structure mirrors `src/lineage_manager/`)
- Run `make test` for coverage; CI runs all targets in Makefile's `all` rule
- PYTHONPATH is set to `src/` (see Makefile export)

---

## Service Architecture Patterns

### 1. **Dependency Injection via Container**
```python
# In endpoints, use @inject decorator + Depends(Provide[...])
from dependency_injector.wiring import Provide, inject
from lineage_manager.core.container import GraphContainer

@router.get("/...")
@inject
def my_endpoint(service: GraphService = Depends(Provide[GraphContainer.graph_query_service])):
    return service.some_method()
```
- Container is wired in `main.py` → auto-injects into endpoint modules
- Write endpoints use `graph_build_service`; read endpoints use `graph_query_service`

### 2. **Unit of Work Pattern for Data Access**
```python
# Inside services (GraphService, GraphQueryService)
uow = self.uow  # injected GraphUnitOfWork
job = uow.jobs.get(job_id)
uow.commit()  # explicit, or use context manager
```
- Repositories: `JobRepository`, `TableRepository`, `ClosureRepository`, `GraphEdgeRepository`
- All work within one transactional session (managed by middleware)

### 3. **Graph Traversal via BFS Neighbors Pattern**
Used in `get_job_neighbors()` and `get_table_neighbors()` methods:
```python
# Example: 2-hop BFS from job to tables to downstream jobs
visited = set([(type, id)])
frontier = [(type, id)]  # (type, db_id) tuples
for _ in range(level):  # iterate up to level hops
    for ntype, nid in frontier:
        # Query neighbors via job_table_links
        # Respect direction: "upstream", "downstream", "both"
```
**Key models**: `GraphJobNode`, `GraphTableNode`, `GraphEdge`, `JobTableLink`

### 4. **Redis Caching for Read Queries (Optional)**
- Enabled via `REDIS_ENABLED=true` in `.env`
- Cache keys follow pattern: `health_stats`, `dag:{table}:{direction}:{depth}`, `neighbors:{type}:{id}:{level}`
- Cache invalidation: write operations (GraphBuildService) should invalidate related keys

---

## Project-Specific Patterns

### Node Keying Convention
- Jobs: `f"j{job.id}"` (internal DB id)
- Tables: `f"t{table.id}"` (internal DB id)
- API accepts **external identifiers** (`job_id` string, `table_name` string) → resolved to DB ids internally

### Response Format for Graph APIs
```python
{
    "base_job": "job_123",  # or base_table
    "nodes": [
        {"id": "j42", "label": "job_name", "data": {"type": "job", ...}},
        {"id": "t7", "label": "table_name", "data": {"type": "table", ...}}
    ],
    "edges": [
        {"source": "j42", "target": "t7", "io": "output"},  # io: "input"/"output"
        {"source": "t7", "target": "j43", "io": "input"}
    ]
}
```

### Endpoint Organization
- `graph.py`: core graph operations (register, DAG, neighbors)
- `jobs.py`: job detail, toggle enabled, dependencies
- `tables.py`: table metadata, triggers, timeliness
- `search.py`: autocomplete suggestions
- `expand.py`, `sync.py`: graph expansion/sync operations
- `diagnostics.py`: health checks, DB diagnostics
- `auth.py`: OIDC authentication flow

### Configuration & Settings
- `.env` file: DATABASE_URL, REDIS_*, OIDC_* (see `core/config.py`)
- Settings loaded via Pydantic `BaseSettings` with env priority
- Use `get_settings()` to access config singleton

---

## Common Tasks

### Add a New Graph Query
1. Implement method in `GraphQueryService` (read-only, cache-eligible)
2. Add endpoint in appropriate `endpoints/*.py` file
3. Use `@inject` decorator + `Depends(Provide[GraphContainer.graph_query_service])`
4. Return response matching `{"nodes": [...], "edges": [...]}`

### Register Custom Repository
1. Create `repositories/my_entity_repository.py` extending `BaseRepository`
2. Add instance to `GraphUnitOfWork.__init__()` 
3. Use via `uow.my_entity` in services

### Add Database Model
1. Create in `models/my_model.py`, extend `Base`
2. Import in `core/database.py` to auto-register
3. Create Alembic migration: `alembic revision --autogenerate`

### Write Service Logic
- Prefer `GraphQueryService` for read-only, `GraphBuildService` for writes
- Both inject `GraphUnitOfWork` and optional `JobManagerAdapter` (external job scheduler)
- Use logging: `logger = logging.getLogger(__name__)`

---

## Integration Points

- **Job Manager Adapter** (`adapters/job_manager_adapter.py`): communicates with external job scheduler via HTTP
- **OIDC Auth** (`core/auth.py`): validates JWT tokens; gate endpoints with `require_authenticated_user`
- **Frontend API Client** (`static/js/app/services/api.js`): vanilla JS consuming `/api/v1/*` endpoints
- **SSE Events** (`core/sse.py`, `endpoints/events.py`): server-sent events for real-time updates (optional polling fallback)

---

## Important Conventions

1. **Session Management**: Don't create raw SQLAlchemy sessions; always use DI container or `GraphUnitOfWork`
2. **Logging**: Use `logging.getLogger(__name__)` module-level; avoid print statements
3. **Error Handling**: Return `{"status": "error", "message": "..."}` for business logic errors; let HTTPException propagate
4. **Foreign Keys**: Use internal DB ids for queries; expose external identifiers (job_id, table_name) in API
5. **Async Functions**: Endpoints can be async; services remain sync (DB ops are blocking)

---

## When Extending Services

Future service splits (aligned with roadmap):
- `GraphLineageService`: lineage-specific transformations
- `GraphImpactService`: downstream/upstream impact analysis
- `GraphValidationService`: consistency checks
- `GraphStatsService`: aggregation and metrics

Keep each service focused on one use case; share repositories via `GraphUnitOfWork`.

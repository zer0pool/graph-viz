Title: Service Split and Query Cache

Summary
- Split concerns into build (write) and query (read) services, and add optional Redis caching for read APIs.

Changes
- New services:
  - `GraphQueryService` (read, cache-enabled)
  - `GraphBuildService` (write facade)
- DI container now provides `graph_query_service` and `graph_build_service`.
- Read endpoints use `GraphQueryService`; write endpoints use `GraphBuildService`.
- Redis config added to `.env` and `Settings`.

Redis
- Env:
  - `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_DEFAULT_TTL`
- Cache keys:
  - `health_stats`, `dag:{table}:{direction}:{depth}:{jobs}:{tables}`
  - `impact:{table}:{depth}:{jobs}`, `neighbors:{type}:{id}:{level}`

Files
- `src/graph_manager/services/graph_query_service.py`
- `src/graph_manager/services/graph_build_service.py`
- `src/graph_manager/core/container.py` (providers wired)
- `.env` (Redis settings), `requirements.txt` (redis)

Usage
- Enable Redis: set `REDIS_ENABLED=true` and run a local Redis (e.g., `docker run -p 6379:6379 redis:7`).


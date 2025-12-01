import json
import logging
from typing import Any, Dict, Optional

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

from lineage_manager.core.config import get_settings
from lineage_manager.core.uow import GraphUnitOfWork
from lineage_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)


class GraphQueryService:
    def __init__(self, uow: GraphUnitOfWork, core: GraphService):
        self.uow = uow
        self.core = core

        settings = get_settings()
        self.redis_enabled = settings.redis.enabled and redis is not None
        self.redis_ttl = settings.redis.default_ttl
        self._r = None
        if self.redis_enabled:
            try:
                self._r = redis.Redis(
                    host=settings.redis.host,
                    port=settings.redis.port,
                    db=settings.redis.db,
                    decode_responses=True,
                )
                # ping to validate
                self._r.ping()
                logger.info("Redis cache enabled for GraphQueryService")
            except Exception as e:  # pragma: no cover
                logger.warning(f"Redis not available, disabling cache: {e}")
                self.redis_enabled = False
                self._r = None

    def _cache_get(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.redis_enabled or not self._r:
            return None
        val = self._r.get(key)
        if not val:
            return None
        try:
            return json.loads(val)
        except Exception:
            return None

    def _cache_set(self, key: str, value: Dict[str, Any]) -> None:
        if not self.redis_enabled or not self._r:
            return
        try:
            self._r.setex(key, self.redis_ttl, json.dumps(value))
        except Exception:
            pass

    # Read APIs with caching wrappers
    def get_health_stats(self):
        key = "health_stats"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_health_stats()
        self._cache_set(key, res)
        return res

    def get_table_dag(
        self,
        full_name: str,
        direction: str,
        depth: int,
        include_jobs: bool,
        include_tables: bool,
    ):
        key = f"dag:{full_name}:{direction}:{depth}:{int(include_jobs)}:{int(include_tables)}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_dag(
            full_name, direction, depth, include_jobs, include_tables
        )
        self._cache_set(key, res)
        return res

    def get_table_impact(self, base_table: str, max_depth: int, include_jobs: bool):
        key = f"impact:{base_table}:{max_depth}:{int(include_jobs)}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_impact(base_table, max_depth, include_jobs)
        self._cache_set(key, res)
        return res

    def get_job_neighbors(
        self, job_id: str, level: int, direction: str = "both", limit: int | None = None
    ):
        lim = "none" if limit is None else str(limit)
        key = f"neighbors:job:{job_id}:{level}:{direction}:{lim}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_job_neighbors(
            job_id, level, direction=direction, limit=limit
        )
        self._cache_set(key, res)
        return res

    def get_table_neighbors(
        self,
        table_name: str,
        level: int,
        direction: str = "both",
        limit: int | None = None,
    ):
        lim = "none" if limit is None else str(limit)
        key = f"neighbors:table:{table_name}:{level}:{direction}:{lim}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_neighbors(
            table_name, level, direction=direction, limit=limit
        )
        self._cache_set(key, res)
        return res

    # Helpers resolving by internal DB id (for frontend convenience)
    def get_job_neighbors_by_dbid(
        self, db_id: int, level: int, direction: str = "both", limit: int | None = None
    ):
        job = self.uow.jobs.get_by_id(db_id)
        if not job:
            return {"status": "error", "message": f"Job with id={db_id} not found"}
        return self.get_job_neighbors(
            job_id=job.job_id, level=level, direction=direction, limit=limit
        )

    def get_table_neighbors_by_dbid(
        self, db_id: int, level: int, direction: str = "both", limit: int | None = None
    ):
        table = self.uow.tables.get_by_id(db_id)
        if not table:
            return {"status": "error", "message": f"Table with id={db_id} not found"}
        return self.get_table_neighbors(
            table_name=table.full_name, level=level, direction=direction, limit=limit
        )

    # Simple search (03)
    def search_suggestions(self, q: str, limit: int = 10):
        # Search jobs by job_id or name, tables by full_name
        like = f"%{q}%"
        jobs = self.uow.jobs.search(q=like, limit=limit)
        tables = self.uow.tables.search(q=like, limit=limit)
        return {
            "query": q,
            "jobs": [{"job_id": j.job_id, "name": j.name} for j in jobs],
            "tables": [{"full_name": t.full_name} for t in tables],
        }

    def get_table_triggers(self, table_name: str):
        key = f"triggers:{table_name}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_triggers(table_name)
        self._cache_set(key, res)
        return res

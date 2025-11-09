import json
import logging
from typing import Any, Dict, Optional

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None

from graph_manager.core.config import get_settings
from graph_manager.core.uow import GraphUnitOfWork
from graph_manager.services.graph_service import GraphService

logger = logging.getLogger(__name__)


class GraphQueryService:
    def __init__(self, uow: GraphUnitOfWork, core: GraphService):
        self.uow = uow
        self.core = core

        settings = get_settings()
        self.redis_enabled = settings.redis_enabled and redis is not None
        self.redis_ttl = settings.redis_default_ttl
        self._r = None
        if self.redis_enabled:
            try:
                self._r = redis.Redis(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    db=settings.redis_db,
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

    def get_table_dag(self, full_name: str, direction: str, depth: int, include_jobs: bool, include_tables: bool):
        key = f"dag:{full_name}:{direction}:{depth}:{int(include_jobs)}:{int(include_tables)}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_dag(full_name, direction, depth, include_jobs, include_tables)
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

    def get_job_neighbors(self, job_id: str, level: int):
        key = f"neighbors:job:{job_id}:{level}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_job_neighbors(job_id, level)
        self._cache_set(key, res)
        return res

    def get_table_neighbors(self, table_name: str, level: int):
        key = f"neighbors:table:{table_name}:{level}"
        cached = self._cache_get(key)
        if cached:
            return cached
        res = self.core.get_table_neighbors(table_name, level)
        self._cache_set(key, res)
        return res


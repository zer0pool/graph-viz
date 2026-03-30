"""
Request-scoped memoization cache for GraphQL resolvers.

Solves the N-call problem: multiple resolvers in a single request that need
the same expensive result (e.g. jobs_uc.execute()) share one cached value
instead of each awaiting the coroutine independently.

Usage in a resolver:
    cache: RequestCache = info.context["cache"]
    all_runs = await cache.get_or_compute("jobs:30d", lambda: jobs_uc.execute(days=30))
"""

from typing import Any, Callable, Coroutine


class RequestCache:
    """Memoizes coroutine results for the lifetime of a single GraphQL request."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    async def get_or_compute(self, key: str, fn: Callable[[], Coroutine]) -> Any:
        if key not in self._store:
            self._store[key] = await fn()
        return self._store[key]

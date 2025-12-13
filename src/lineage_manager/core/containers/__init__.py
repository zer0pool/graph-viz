"""
Dependency Injection Containers.

This package contains domain-specific DI containers that organize
services and dependencies by business domain.

Each container uses get_settings() directly for configuration,
which allows them to be wired together without complex dependency passing.
"""

from .core_container import CoreContainer
from .job_container import JobContainer
from .user_container import UserContainer
from .bigquery_container import BigQueryContainer
from .graph_container import GraphContainer

__all__ = [
    "CoreContainer",
    "JobContainer",
    "UserContainer",
    "BigQueryContainer",
    "GraphContainer",
]

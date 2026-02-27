import strawberry
from enum import Enum
from typing import List, Optional

from strawberry.types import Info
@strawberry.enum
class MetricStatus(Enum):
    DEFAULT = "default"
    SUCCESS = "success"
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    DESTRUCTIVE = "destructive"


@strawberry.type
class MetricDimensions:
    """Dimensions for breakdown/Top N data."""
    type: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None
    name: Optional[str] = None  # Used for Top N identity


@strawberry.type
class TrendPoint:
    """Single point in a time-series chart."""
    time: str
    value: float
    series: Optional[str] = None  # e.g., "2025" or "2026"


@strawberry.type
class MetricBreakdown:
    """Detailed breakdown items for a metric."""
    label: str
    value: float
    color: Optional[str] = None


@strawberry.type
class MetricGroups:
    """
    Consolidated Analytics Group (Cloudflare Style).
    Supports simple aggregates, dimensions, and history.
    """
    id: strawberry.ID
    label: Optional[str] = None
    count: Optional[int] = None
    sum: Optional[float] = None
    avg: Optional[float] = None
    status: MetricStatus = MetricStatus.DEFAULT
    dimensions: Optional[MetricDimensions] = None
    history: Optional[List[TrendPoint]] = None
    breakdown: Optional[List[MetricBreakdown]] = None


@strawberry.type
class JobConfig:
    """Static configuration for a job (Lineage Manager)."""
    owner: Optional[str] = None
    schedule: Optional[str] = None
    project_id: Optional[str] = None
    type: Optional[str] = None  # SELF-TYPE, REQUEST-TYPE


@strawberry.type
class JobStats:
    """Dynamic execution stats (Analytics Manager/BigQuery)."""
    avg_slots: Optional[float] = None
    max_slots: Optional[int] = None
    total_duration_24h: Optional[int] = None
    last_run_status: Optional[str] = None
    updated_at: Optional[str] = None


@strawberry.type
class Job:
    """Unified Job entity (Combined Config + Stats)."""
    id: strawberry.ID
    display_label: str
    config: JobConfig
    stats: Optional[JobStats] = None


@strawberry.type
class TableConfig:
    """Static configuration for a table (Lineage Manager)."""
    owners: List[str] = strawberry.field(default_factory=list)
    upstream_jobs: List[str] = strawberry.field(default_factory=list)
    downstream_jobs: List[str] = strawberry.field(default_factory=list)


@strawberry.type
class TableStats:
    """Dynamic metadata for a table (BigQuery/Metrics)."""
    row_count: Optional[int] = None
    total_size_bytes: Optional[int] = None
    last_update_time: Optional[str] = None
    append_count_24h: Optional[int] = None
    update_mode: Optional[str] = None  # FULL_DUMP, APPEND


@strawberry.type
class Table:
    """Unified Table entity (Combined Config + Stats)."""
    id: strawberry.ID
    fqn: str
    config: TableConfig
    stats: Optional[TableStats] = None


@strawberry.type
class PageInfo:
    """Relay-style pagination info."""
    has_next_page: bool
    next_offset: Optional[int] = None
    end_cursor: Optional[str] = None


@strawberry.type
class JobEdge:
    """Relay-style edge for jobs connection."""
    node: Job
    cursor: str


@strawberry.type
class JobConnection:
    """Relay-style connection for job lists (Layer 3)."""
    edges: List[JobEdge]
    page_info: PageInfo
    total_count: int


@strawberry.type
class TableEdge:
    """Relay-style edge for tables connection."""
    node: Table
    cursor: str


@strawberry.type
class TableConnection:
    """Relay-style connection for table lists (Layer 3)."""
    edges: List[TableEdge]
    page_info: PageInfo
    total_count: int


@strawberry.input
class JobFilter:
    """Advanced filtering for Job explorer."""
    search_term: Optional[str] = None
    project_id: Optional[str] = None
    owner: Optional[str] = None
    min_slots: Optional[int] = None
    min_duration_24h: Optional[int] = None
    status: Optional[str] = None


@strawberry.input
class TableFilter:
    """Advanced filtering for Table explorer."""
    search_term: Optional[str] = None
    owner: Optional[str] = None
    updated_after: Optional[str] = None  # ISO format
    min_rows: Optional[int] = None
    update_mode: Optional[str] = None


@strawberry.type
class User:
    """Represents a user entity."""
    id: strawberry.ID
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None

    @strawberry.field(description="List of projects this user is a member of.")
    async def projects(self, info: Info) -> List["Project"]:
        # Mocking: In reality, call a service like user_service.get_user_projects(self.id)
        return [
            Project(id=strawberry.ID("p1"), display_name="Sales Analytics"),
            Project(id=strawberry.ID("p2"), display_name="Platform Monitoring")
        ]


@strawberry.type
class Project:
    """Represents a project entity."""
    id: strawberry.ID
    display_name: str
    description: Optional[str] = None

    @strawberry.field(description="List of users who are members of this project.")
    async def members(self, info: Info) -> List["User"]:
        # Mocking: In reality, call a service like project_service.get_project_members(self.id)
        return [
            User(id=strawberry.ID("u1"), username="admin", full_name="Administrator"),
            User(id=strawberry.ID("u2"), username="viewer", full_name="Data Viewer")
        ]

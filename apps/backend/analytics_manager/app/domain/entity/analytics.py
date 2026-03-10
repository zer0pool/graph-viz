from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TrackEvent(BaseModel):
    event_type: str = "page_view"
    visitor_id: Optional[str] = None
    path: str
    title: Optional[str] = None
    timestamp: Optional[datetime] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class MetricBreakdown(BaseModel):
    label: str
    value: float
    color: str


class MetricItem(BaseModel):
    id: str
    label: str
    count: Optional[int] = None
    sum: Optional[float] = None
    status: str = "default"
    breakdown: Optional[List[MetricBreakdown]] = None
    dimensions: Optional[Dict[str, str]] = None


class TrendPoint(BaseModel):
    time: str
    value: float
    series: str


class MetricGroup(BaseModel):
    """Domain representation of a grouped metric (e.g., used for GraphQL rendering)."""

    id: str
    label: str
    count: Optional[int] = None
    sum: Optional[float] = None
    status: str = "default"
    breakdown: Optional[List[MetricBreakdown]] = None
    history: Optional[List[TrendPoint]] = None
    dimensions: Optional[Dict[str, str]] = None

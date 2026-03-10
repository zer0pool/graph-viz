from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TrackEventRequest(BaseModel):
    event_type: str = "page_view"
    visitor_id: Optional[str] = None
    path: str
    title: Optional[str] = None
    properties: Dict[str, Any] = {}


class TrackResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None


class MetricBreakdownSchema(BaseModel):
    label: str
    value: float
    color: str


class MetricItemSchema(BaseModel):
    type: str
    value: Any
    label: Optional[str] = None
    subtext: Optional[str] = None
    status: str = "default"
    breakdown: Optional[List[MetricBreakdownSchema]] = None


class SummaryResponse(BaseModel):
    metrics: List[MetricItemSchema]

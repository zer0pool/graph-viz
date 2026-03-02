from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TrackEvent(BaseModel):
    event_type: str = "page_view"
    visitor_id: Optional[str] = None
    path: str
    title: Optional[str] = None
    timestamp: Optional[datetime] = None
    properties: Dict[str, Any] = {}


class TrackResponse(BaseModel):
    status: str = "success"
    message: Optional[str] = None


class MetricItem(BaseModel):
    type: str
    value: Any
    label: Optional[str] = None
    subtext: Optional[str] = None
    status: str = "default"
    breakdown: Optional[List[Dict[str, Any]]] = None


class SummaryResponse(BaseModel):
    metrics: List[MetricItem]

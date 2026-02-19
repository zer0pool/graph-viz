from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

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

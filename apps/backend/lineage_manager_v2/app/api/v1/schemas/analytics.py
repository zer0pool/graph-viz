from pydantic import BaseModel
from typing import List, Optional, Any

class MetricBreakdown(BaseModel):
    label: str
    value: int

class MetricItem(BaseModel):
    type: str
    value: Any
    subtext: str
    status: Optional[str] = "default"
    breakdown: Optional[List[MetricBreakdown]] = None

class DashboardMetricsResponse(BaseModel):
    metrics: List[MetricItem]

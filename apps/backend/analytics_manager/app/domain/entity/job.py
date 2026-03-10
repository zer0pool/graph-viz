from typing import List, Optional

from pydantic import BaseModel


class JobRunContext(BaseModel):
    job_id: str
    dag_id: Optional[str] = None
    execution_time: str
    next_start_time: str
    publish_time: str
    destination: Optional[str] = None
    issuer: str
    period: Optional[str] = None
    date: Optional[str] = None
    hour: Optional[str] = None
    name: Optional[str] = None
    project_id: Optional[str] = None
    owners: List[str] = []
    type: Optional[str] = None
    status: Optional[str] = None
    duration: int
    progress: float

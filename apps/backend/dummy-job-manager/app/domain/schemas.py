from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class SchedulingType(str, Enum):
    SELF_TYPE = "SELF-TYPE"
    REQUEST_TYPE = "REQUEST-TYPE"

class JobSelector(BaseModel):
    type: str
    job_id: str

class JobSelectorRequest(BaseModel):
    jobs: List[JobSelector]

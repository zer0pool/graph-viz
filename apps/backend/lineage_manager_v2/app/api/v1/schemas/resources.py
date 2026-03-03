from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    project_id: str
    display_name: str
    description: Optional[str] = None
    business_unit: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobBase(BaseModel):
    project_id: str
    name: str  # The friendly name
    owners: List[str] = []
    properties: Dict[str, Any] = {}


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    owners: Optional[List[str]] = None
    properties: Optional[Dict[str, Any]] = None


class Job(JobBase):
    job_id: str  # The authoritative FQN ID
    id: int  # Internal DB ID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobBatchRequest(BaseModel):
    job_ids: List[str]


class JobBatchResponse(BaseModel):
    results: Dict[str, Job]


class ResourceBase(BaseModel):
    project_id: str
    fqn: str
    data_type: str = "BIGQUERY"
    data_info: Dict[str, Any] = {}


class ResourceCreate(ResourceBase):
    pass


class Resource(ResourceBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    user_id: str
    sub: str
    login_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    roles: List[str] = []
    department: Optional[str] = None
    status: str


class User(UserBase):
    id: int
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    owned_jobs: int
    project_count: int


class UserDetail(BaseModel):
    user: User
    summary: UserSummary


class UserProjectResponse(BaseModel):
    projects: List[Project]
    total: int


class UserJobResponse(BaseModel):
    jobs: List[Job]
    total: int


class UserListResponse(BaseModel):
    users: List[User]
    total: int
    limit: int
    offset: int

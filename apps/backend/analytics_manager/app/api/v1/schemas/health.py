from typing import Optional

from pydantic import BaseModel


class GoogleCloudStatus(BaseModel):
    status: str
    project_id: Optional[str] = None
    service_account_email: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    google_cloud: GoogleCloudStatus

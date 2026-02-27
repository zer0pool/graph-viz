from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, status

from app.api.v1.schemas.health import HealthResponse, GoogleCloudStatus
from app.core.container import Container
from app.infrastructure.gcp.client import GoogleCloudClient

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK, response_model=HealthResponse)
@inject
async def health(
    google_client: GoogleCloudClient = Depends(Provide[Container.google_client]),
):
    """
    Service Health Check

    This endpoint verifies the health of the Analytics Manager service,
    including connectivity to Google Cloud APIs.
    """
    google_status = google_client.check_health()

    # Ensure correct mapping for Pydantic validation
    return HealthResponse(
        status="healthy", 
        service="analytics-manager", 
        google_cloud=GoogleCloudStatus(**google_status)
    )

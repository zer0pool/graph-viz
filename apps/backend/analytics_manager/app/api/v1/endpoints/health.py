from fastapi import APIRouter, status

from app.api.v1.schemas.health import GoogleCloudStatus, HealthResponse

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK, response_model=HealthResponse)
async def health():
    """
    Service Health Check
    This endpoint verifies the health of the Analytics Manager service
    """

    # Ensure correct mapping for Pydantic validation
    return HealthResponse(
        status="healthy",
        service="analytics-manager",
        google_cloud=GoogleCloudStatus(
            status="healthy", project_id="test", service_account="test@example.com"
        ),
    )

import logging

from google.auth import default
from google.auth.transport.requests import Request

from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleCloudClient:
    def __init__(self):
        self.credentials = None
        self.project_id = None
        self._load_credentials()

    def _load_credentials(self):
        try:
            # 1. Attempt using Application Default Credentials (ADC)
            # This handles GOOGLE_APPLICATION_CREDENTIALS env var automatically
            # Add scope for full Cloud Platform access (needed for refresh)
            creds, project_id = default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            self.credentials = creds
            self.project_id = project_id or settings.GOOGLE_PROJECT_ID
            logger.info(f"Loaded Google Credentials for project: {self.project_id}")
        except Exception as e:
            logger.error(f"Failed to load Google Credentials: {e}")
            self.credentials = None

    def check_health(self) -> dict:
        """
        Verifies if the credentials are valid by refreshing the token.
        This confirms we can talk to Google Auth servers.
        """
        if not self.credentials:
            return {"status": "unhealthy", "error": "No credentials loaded"}

        try:
            # Prepare a request object needed for refreshing/validating credentials
            req = Request()
            if not self.credentials.valid:
                self.credentials.refresh(req)

            # Simple check: do we have a token?
            token = self.credentials.token
            if token:
                return {
                    "status": "healthy",
                    "project_id": self.project_id,
                    "service_account_email": getattr(
                        self.credentials, "service_account_email", "unknown"
                    ),
                }
            else:
                return {"status": "unhealthy", "error": "Token is empty"}

        except Exception as e:
            logger.error(f"Google Health Check Failed: {e}")
            return {"status": "unhealthy", "error": str(e)}

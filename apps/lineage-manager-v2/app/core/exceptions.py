from fastapi import Request, status
from fastapi.responses import JSONResponse

class AppError(Exception):
    """Base error class."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, item: str):
        super().__init__(f"{item} not found", status_code=404)

async def app_exception_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )

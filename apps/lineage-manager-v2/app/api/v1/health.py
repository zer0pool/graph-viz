from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Verify API and DB connection.
    """
    try:
        # Simple query to check DB connectivity
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected", "service": "lineage-manager-v2"}
    except Exception as e:
        return {"status": "error", "db": "disconnected", "detail": str(e)}

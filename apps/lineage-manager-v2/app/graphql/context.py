from app.db.session import AsyncSessionLocal
from strawberry.fastapi import BaseContext

class Context(BaseContext):
    def __init__(self, session):
        self.session = session

async def get_context() -> Context:
    async with AsyncSessionLocal() as session:
        try:
            yield Context(session=session)
        finally:
            await session.close()

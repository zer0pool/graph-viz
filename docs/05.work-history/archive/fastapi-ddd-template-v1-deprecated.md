---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [agents.md, fastapi-refactoring-guide.md]
tags: [fastapi, ddd, template, boilerplate, solid]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.0
Status: Shipped
Title: OPS Console: FastAPI DDD Project Template

Summary:
Provides a comprehensive boilerplate for a FastAPI project based on Domain-Driven Design (DDD) principles. This template emphasizes separation of concerns, testability, and scalability using async SQLAlchemy and Pydantic.

---

## 🏗️ Design Principles

This template adheres to the following core architectural standards:

- **Domain-Driven Design (DDD)**: Logic organized around domain units.
- **SOLID Principles**: Clean, modular, and extensible code.
- **Pydantic Layering**: Separate schemas for request, response, and domain.
- **Dependency Injection (DI)**: Decoupled services and repositories.
- **Async First**: Full support for asynchronous I/O with FastAPI and SQLAlchemy.
- **Test-Driven Ready**: Designed for easy mocking and integration testing.

---

## 📁 Directory Structure

```text
app/
├── main.py               # App entry point & initialization
├── core/                 # Global configuration, security, and logging
│   ├── config.py
│   ├── security.py
│   └── logging.py
├── api/                  # API Routers (Entry points)
│   └── v1/
│       └── user.py
├── domain/               # Domain Layer (Business Logic)
│   └── user/
│       ├── models.py     # SQLAlchemy ORM Entities
│       ├── schemas.py    # Pydantic Schemas
│       ├── repository.py # Data Access Layer
│       ├── service.py    # Domain Logic & Orchestration
│       └── exceptions.py # Custom Domain Exceptions
├── db/                   # Database sessions and base models
│   ├── base.py
│   ├── session.py
│   └── init_db.py
├── tests/                # Automated tests
│   └── user/
│       └── test_user.py
├── requirements.txt
└── alembic/              # Database migration (optional)
```

---

## 1️⃣ `main.py` – App Initialization

```python
from fastapi import FastAPI
from app.api.v1 import user
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Register Routers
app.include_router(user.router, prefix="/api/v1/users", tags=["Users"])
```

---

## 2️⃣ `core/config.py` – Global Configuration

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI-DDD-App"
    DATABASE_URL: str = "sqlite+aiosqlite:///./db.sqlite3"
    JWT_SECRET: str = "super-secret"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 3️⃣ `api/v1/user.py` – API Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from app.domain.user.schemas import UserCreate, UserOut
from app.domain.user.service import UserService
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter()

@router.post("/", response_model=UserOut)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
    service: UserService = Depends()
):
    return await service.create_user(user, db)
```

---

## 4️⃣ `domain/user/schemas.py` – Pydantic Schemas

```python
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True  # Pydantic V2 (formerly orm_mode=True)
```

---

## 5️⃣ `domain/user/models.py` – SQLAlchemy Domain Model

```python
from sqlalchemy import Column, Integer, String
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
```

---

## 6️⃣ `domain/user/repository.py` – Data Access Layer

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.domain.user.models import User

class UserRepository:
    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, user: User) -> User:
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
```

---

## 7️⃣ `domain/user/service.py` – Domain Service Layer

```python
from app.domain.user.repository import UserRepository
from app.domain.user.schemas import UserCreate
from app.domain.user.models import User
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib

class UserService:
    def __init__(self):
        self.repo = UserRepository()

    async def create_user(self, user_create: UserCreate, db: AsyncSession) -> User:
        existing = await self.repo.get_by_email(db, user_create.email)
        if existing:
            raise ValueError("User already exists")

        # Example hashing logic
        hashed_pw = hashlib.sha256(user_create.password.encode()).hexdigest()
        user_entity = User(email=user_create.email, hashed_password=hashed_pw)
        return await self.repo.create(db, user_entity)
```

---

## 8️⃣ `db/session.py` – Database Session Management

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 9️⃣ `db/base.py` – SQLAlchemy Declarative Base

```python
from sqlalchemy.orm import declarative_base

Base = declarative_base()
```

---

## 🔟 `tests/user/test_user.py` – Example Test

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_user():
    response = client.post(
        "/api/v1/users/", 
        json={"email": "test@example.com", "password": "magic-password"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
```

---

## 📦 `requirements.txt`

```text
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
aiosqlite
pydantic
pydantic-settings
python-dotenv
```

---

## 🧪 Service & Operation

### Run Dev Server
```bash
uvicorn app.main:app --reload
```

### Database Migrations
```bash
alembic init alembic
# Configure env.py to use app.db.base.Base and Async engine
```

---
status: draft
owner: David
created: 2026-03-09
updated: 2026-03-09
version: 2.0
related: [agents.md, fastapi-refactoring-guide.md, fastapi-ddd-template.md]
tags: [fastapi, ddd, template, clean-architecture, solid]
---

Created: 2026-03-09
Updated: 2026-03-09
Author: David
Version: 2.0
Status: Draft
Title: OPS Console: FastAPI DDD Project Template v2 (Clean Architecture)

Summary:
Provides an upgraded, strict 4-layer boilerplate for a FastAPI project based on Domain-Driven Design (DDD) and Clean Architecture principles. It emphasizes a strict separation between `domain`, `application`, `infrastructure`, and `controller`, enabling highly testable, scalable, and modular backends.

---

## 🏗️ Design Principles & Dependency Rules

This template adheres to the following core architectural standards:

- **Strict Dependency Direction**: 
  - `controller` -> `application` -> `domain`
  - `infrastructure` -> `domain` (or `application` if implementing an application port)
  - `domain` is isolated and depends on **nothing else**.
  - `controller` does NOT depend on `infrastructure` directly (resolved via DI).
- **Domain-Driven Design (DDD)**: Logic organized around domain units (Entities, Services).
- **SOLID Principles**: Clean, modular, and extensible code.
- **Session & UoW Management**: 1 request = 1 session (via FastAPI `Depends`). Complex cross-repository transactions are handled by the `UnitOfWork` pattern in the `application` layer.
- **Async First**: Full support for asynchronous I/O with FastAPI and SQLAlchemy.

---

## 📁 Directory Structure (4-Layered)

```text
app/
├── domain/               # Domain Layer (Core Business Logic)
│   ├── entity/           # Entities & Value Objects (Pydantic Models)
│   ├── repository/       # Repository Interfaces (Abstract Classes)
│   ├── gateway/          # External Service Interfaces
│   ├── service/          # Domain Services (Cross-entity logic, pure functions)
│   └── error/            # Domain Exceptions
├── application/          # Application Layer (Use Cases & Orchestration)
│   ├── usecase/          # Application Use Cases
│   ├── service/          # Shared Application Logic
│   └── uow/              # Unit of Work Interfaces
├── infrastructure/       # Infrastructure Layer (Implementation Details)
│   ├── repository/       # Concrete Repository Implementations (SQLAlchemy)
│   ├── gateway/          # Concrete Gateway Implementations (HTTP Clients)
│   ├── di/               # Dependency Injection & Session Supply
│   ├── middleware/       # FastAPI Middlewares
│   └── uow/              # Concrete Unit of Work (SQLAlchemy)
└── controller/           # Presentation Layer (HTTP/API Border)
    ├── router/           # FastAPI Routers & Endpoints
    ├── schemas/          # API Request/Response Schemas (Pydantic)
    └── factory/          # Use Case Factory / DI Resolvers
```

---

## 1️⃣ `domain` Layer – Core Business Logic
*No external dependencies (No FastAPI, No SQLAlchemy).*

### `domain/entity/user.py` – Entity
```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    id: str
    email: EmailStr

    def change_email(self, new_email: str) -> "User":
        return User(id=self.id, email=new_email)
```

### `domain/repository/user_repository.py` – Interface
```python
from abc import ABC, abstractmethod
from app.domain.entity.user import User

class UserRepository(ABC):
    @abstractmethod
    async def get(self, user_id: str) -> User | None:
        raise NotImplementedError

    @abstractmethod
    async def save(self, user: User) -> None:
        raise NotImplementedError
```

---

## 2️⃣ `application` Layer – Use Cases & UoW
*Expresses business workflows.*

### `application/uow_async.py` – UoW Interface
```python
from abc import ABC, abstractmethod
from contextlib import AbstractAsyncContextManager
from sqlalchemy.ext.asyncio import AsyncSession

class AsyncUnitOfWork(ABC, AbstractAsyncContextManager):
    @property
    @abstractmethod
    def session(self) -> AsyncSession: ...

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...
```

### `application/usecase/change_user_email.py` – Use Case
```python
from app.domain.repository.user_repository import UserRepository

class ChangeUserEmail:
    def __init__(self, users_repo: UserRepository) -> None:
        self._users = users_repo

    async def execute(self, user_id: str, new_email: str) -> None:
        user = await self._users.get(user_id)
        if user is None:
            raise ValueError("user_not_found")
        await self._users.save(user.change_email(new_email))
```

---

## 3️⃣ `infrastructure` Layer – Implementations
*Database, ORMs, External APIs.*

### `infrastructure/repository/user_repository.py` – Implementation
```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.user import User
from app.domain.repository.user_repository import UserRepository

class SqlUserRepository(UserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: str) -> User | None:
        # Fetch from DB and build Domain Entity
        pass

    async def save(self, user: User) -> None:
        # Convert Domain Entity to SQLAlchemy Model and save
        pass
```

### `infrastructure/di/db.py` – Session Provider
```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.db import AsyncSessionLocal

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 4️⃣ `controller` Layer – FastAPI Entrypoints
*HTTP Boundary. Handles request/response translations.*

### `controller/schemas/user.py` – API Schemas
```python
from pydantic import BaseModel, EmailStr

class ChangeEmailRequest(BaseModel):
    email: EmailStr
```

### `controller/factory/usecase.py` – DI Resolver
```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.di.db import get_session
from app.infrastructure.repository.user_repository import SqlUserRepository
from app.application.usecase.change_user_email import ChangeUserEmail

def get_change_user_email(session: AsyncSession = Depends(get_session)) -> ChangeUserEmail:
    repo = SqlUserRepository(session)
    return ChangeUserEmail(users_repo=repo)
```

### `controller/router/users.py` – Router
```python
from fastapi import APIRouter, Depends
from app.controller.schemas.user import ChangeEmailRequest
from app.controller.factory.usecase import get_change_user_email
from app.application.usecase.change_user_email import ChangeUserEmail

router = APIRouter()

@router.post("/users/{user_id}/email")
async def change_email(
    user_id: str,
    req: ChangeEmailRequest,
    uc: ChangeUserEmail = Depends(get_change_user_email),
):
    await uc.execute(user_id, req.email)
    return {"status": "ok"}
```

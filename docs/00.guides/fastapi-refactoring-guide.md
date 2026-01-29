---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [agents.md, codebase-map.md]
tags: [fastapi, python, refactoring, ddd, solid]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.0
Status: Shipped
Title: OPS Console: FastAPI Refactoring Guide

Summary:
Defined the standard refactoring procedures and structural patterns for the FastAPI-based backend. Focuses on Domain-Driven Design (DDD), SOLID principles, asynchronous I/O, and testability.

---

## 📌 Purpose

This document defines the **refactoring standards** for FastAPI projects to enhance structural consistency and maintainability. It incorporates Domain-Driven Design (DDD), SOLID principles, asynchronous I/O, and type safety.

---

## ✅ Core Principles

| Principle | Description |
| :--- | :--- |
| **SRP** | Each module/class/function should have only one responsibility. |
| **SoC** | Clear separation between API, Service, Schema, Model, and Repository. |
| **DRY** | Eliminate redundant validation, exception handling, and logic. |
| **Async** | All I/O operations must be written using `async def` where possible. |
| **Testable** | Decouple external dependencies to enable dependency injection and mocking. |

---

## 🧱 Refactoring Triggers

| Target | Indicators for Refactoring |
| :--- | :--- |
| **Router** | Contains too much business logic or becomes excessively long. |
| **Pydantic Model** | Mixes request, response, and internal domain models. |
| **DB Access** | ORM/SQL logic is exposed directly in the router layer. |
| **Testing** | Functions are tightly coupled with external services (DB, S3, etc.). |
| **Exceptions** | Redundant try/except blocks or inconsistent error structures. |

---

## 🧭 Step-by-Step Refactoring Strategy

### 1. Folder Structure Refinement

**Before (Monolithic/Flat):**
```
project/
├── main.py
├── routes.py
├── models.py
├── schemas.py
```

**After (Modular/Layered):**
```
project/
├── main.py
├── api/
│   └── v1/
│       └── user.py
├── core/
│   ├── config.py
│   └── security.py
├── models/
│   └── user.py
├── schemas/
│   └── user.py
├── services/
│   └── user_service.py
├── repositories/
│   └── user_repository.py
├── db/
│   ├── session.py
│   └── base.py
├── tests/
│   └── api/test_user.py
```

---

### 2. API → Service Separation (Thin Routers)

**Before (Bad - Logic in Router):**
```python
@app.post("/user")
async def create_user(user: UserCreate):
    hashed_pw = hash_password(user.password)
    db_user = User(email=user.email, password=hashed_pw)
    db.add(db_user)
    db.commit()
    return db_user
```

**After (Good - Layered Separation):**

```python
# api/v1/user.py (Router)
@router.post("/")
async def create_user(user: UserCreate, service: UserService = Depends()):
    return await service.create_user(user)

# services/user_service.py (Service)
class UserService:
    async def create_user(self, user: UserCreate):
        hashed = hash_password(user.password)
        user_entity = User(email=user.email, password=hashed)
        return await self.repo.save(user_entity)

# repositories/user_repository.py (Repository)
class UserRepository:
    async def save(self, user: User):
        self.db.add(user)
        await self.db.commit()
        return user
```

---

### 3. Pydantic Schema Separation
Categorize schemas based on their usage to prevent leaking internal fields.
```python
# schemas/user.py
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
```

### 4. Common Exception Handling
Centralize error management using custom exceptions and global handlers.
```python
# exceptions/user.py
class UserAlreadyExists(Exception):
    pass

# middlewares/error_handler.py
@app.exception_handler(UserAlreadyExists)
async def handle_user_exists(request, exc):
    return JSONResponse(status_code=409, content={"detail": "User already exists"})
```

### 5. Settings Isolation
Use `BaseSettings` for environment-based configuration.
```python
# core/config.py
class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str

settings = Settings()
```

### 6. Dependency Injection Pattern
```python
# dependencies/db.py
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 7. Improving Testability
Use interfaces or constructor injection to allow mocking during unit tests.
```python
# services/user_service.py
class UserService:
    def __init__(self, repo: IUserRepository):
        self.repo = repo

# tests/services/test_user_service.py
def test_create_user_success():
    mock_repo = Mock(spec=IUserRepository)
    service = UserService(mock_repo)
    # ... assert logic here
```

---

## 🚧 Refactoring Checklist

- [ ] Are Routers thin, with business logic moved to Services?
- [ ] Is DB logic completely abstracted into Repositories?
- [ ] Are all external dependencies handled via Dependency Injection?
- [ ] Are Pydantic schemas separated by Request, Response, and Domain?
- [ ] Is error handling centralized via custom exceptions?
- [ ] Is `async` utilized correctly for all I/O?
- [ ] Is the code structure easily mockable for unit testing?

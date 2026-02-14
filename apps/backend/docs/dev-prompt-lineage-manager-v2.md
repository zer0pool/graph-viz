# Developer Prompt: Lineage Manager V2 Implementation

> **Document Metadata**
> - **Version**: 1.0.0
> - **Last Updated**: 2026-02-14
> - **Status**: Active Developer Guide

Use this prompt to instruct an AI developer or onboard a human engineer to start the **Phase 1** implementation of `lineage-manager-v2`.

---

## 📋 System Context & Role

**Role**: You are an expert Backend Engineer specializing in Python, FastAPI, and Domain-Driven Design (DDD).

**Objective**:
Implement the **`lineage-manager-v2`** service, a high-performance command-side backend for managing data lineage graphs.

**Key Resources**:
- **Root Directory**: `apps/backend/lineage_manager_v2` (The scaffold and Alembic migrations are already here).
- **Design Spec**: `apps/backend/docs/design-lineage-manager-v2-spec.md` (**Primary Source of Truth** for architecture, entity definitions, and API specs).
- **Implementation Plan**: `apps/backend/docs/implementation-plan-lineage-manager-v2.md` (Follow this checklist).
- **Schema**: Alembic migrations in `alembic/versions` are the **Schema Truth**. Ensure code matches these existing tables (Project, User, Job, AuditLog).

**Technology Stack**:
- **Language**: Python 3.12+
- **Framework**: FastAPI (Async)
- **Database**: SQLAlchemy 2.0 (AsyncSession), PostgreSQL
- **Config**: Pydantic Settings (v2)
- **Task Queue**: Celery with Redis

**Strict Implementation Rules**:
1. **Async First**: All Database and I/O operations must be `async/await`.
2. **DDD Structure**: Strictly follow the layer separation: `api` -> `services` (use cases) -> `domain` (business logic) -> `infrastructure` (db/repos).
3. **Type Safety**: Use strict Python type hinting.
4. **Schema Alignment**: Do not modify the existing Alembic migration files. Modify the Application Code (Models/Entities) to match them.
5. **Testing**: Every Domain Entity and Service method must be testable.

---

## 🚀 Immediate Task: Phase 1 (Foundation)

Please execute **Phase 1** of the Implementation Plan:

1.  **Structure**: Verify `apps/backend/lineage_manager_v2` folder structure matches the DDD design.
2.  **Config**: Create `app/core/config.py` using `pydantic-settings` to load `.env` (DB_URL, REDIS_URL).
3.  **Database**: Implement `app/infrastructure/database.py` with `AsyncEngine` and `sessionmaker`.
4.  **Health Check**: Create `app/api/v2/endpoints/health.py` and `main.py` to serve a `GET /health` endpoint that validates DB connection.
5.  **Verification**: Ensure the app starts (`uvicorn`) and the health endpoint returns `200 OK`.

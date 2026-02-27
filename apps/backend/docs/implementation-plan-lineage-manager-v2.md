# Lineage Manager V2 Implementation Checklist

> **Document Metadata**
> - **Version**: 1.0.0
> - **Last Updated**: 2026-02-14
> - **Status**: Active Implementation Plan

This document outlines the step-by-step implementation plan for `lineage-manager-v2`, based on the [Design Specification](./design-lineage-manager-v2-spec.md). Use this checklist to track progress.

---

## 🟢 Phase 1: Project Foundation & Configuration

**Goal**: Initialize a robust, async-ready FastAPI service backbone connected to the database.

- [x] **1.1 Project Structure Setup**
  - **Requirements**: Verify/Create folder structure (`app/api`, `app/core`, `app/domain`, `app/infrastructure`). Ensure `pyproject.toml` has necessary dependencies (`fastapi`, `sqlalchemy[asyncio]`, `alembic`, `pydantic-settings`).
  - **Test**: Run `uvicorn app.main:app` successfully.

- [x] **1.2 Configuration Management**
  - **Requirements**: Implement `app/core/config.py` using `pydantic-settings`. Load `DATABASE_URL`, `REDIS_URL` from `.env`.
  - **Test**: Verify `settings.DATABASE_URL` is loaded correctly in a python shell.

- [x] **1.3 Database Connection (Async)**
  - **Requirements**: Configure `AsyncEngine` and `AsyncSession` factory in `app/infrastructure/database.py`.
  - **Test**: Create a script to connect to DB and execute `SELECT 1`.

- [x] **1.4 Health Check Endpoint**
  - **Requirements**: Implement `GET /health` in `app/api/v2/endpoints/health.py`. Should check DB and Redis connectivity.
  - **Test**: `curl localhost:8000/api/v2/health` returns `{"status": "healthy", "database": "connected"}`.

---

## 🟡 Phase 2: Domain Layer & Repositories

**Goal**: Implement the core business logic and persistence layer using DDD patterns.

- [x] **2.1 Domain Entities**
  - **Requirements**: Create dataclasses in `app/domain/` for `Project`, `User`, `Job`, `Table`, `AuditLog`. Ensure `job_id` property logic is correct.
  - **Reference**: Design Spec Section 3.1 & 3.2.
  - **Test**: Unit tests for Entity creation and property logic.

- [x] **2.2 Infrastructure Models (SQLAlchemy)**
  - **Requirements**: Map existing Alembic tables (`project`, `user_account`, `job_owner`, `audit_log`) to SQLAlchemy ORM models in `app/infrastructure/models.py`.
  - **Test**: Verify model fields match DB schema exactly.

- [x] **2.3 Repositories**
  - **Requirements**: Implement `ProjectRepository`, `UserRepository`, `JobRepository`, `AuditRepository`. Support basic CRUD and list by owner/project.
  - **Reference**: Design Spec Section 3.2.
  - **Test**: Integration test - Save a Job, Retrieve it, Verify fields.

- [x] **2.4 Unit of Work (UoW)**
  - **Requirements**: Implement `UnitOfWork` class to manage transaction boundaries.
  - **Test**: Test transactional integrity (rollback on error).

---

## 🟠 Phase 3: Resource APIs (REST)

**Goal**: Expose authoritative metadata through RESTful endpoints.

- [x] **3.1 Project & User Endpoints**
  - **Requirements**: `GET /projects/{id}/jobs`, `GET /users/{id}/jobs`.
  - **Test**: Verify listing filters correctly by target id.

- [x] **3.2 Job CRUD Endpoints**
  - **Requirements**: `POST /jobs`, `GET /jobs/{job_id}`, `PUT /jobs`. Supports complex properties.
  - **Reference**: Design Spec Section 4.8.
  - **Test**: Verify job creation and retrieval preserves nested properties.

- [x] **3.3 Table Endpoints**
  - **Requirements**: `POST /tables`, `GET /tables/{fqn}`.
  - **Test**: Verify FQN-based lookup.

---

## 🟢 Phase 4: Lineage Engine & Graph Query

**Goal**: Implement high-performance lineage traversal.

- [x] **4.1 Ingestion Service**
  - **Requirements**: Implement `LineageService.register_lineage` to create edges in `graph_edge`.
  - **Test**: Verify edges are created for different entity types.

- [x] **4.2 Closure Table Sync**
  - **Requirements**: Implement recursive logic (incremental or full rebuild) for `graph_closure`.
  - **Test**: Verify that a chain `A -> B -> C` results in `(A, C, depth=2)` in closure table.

- [x] **4.3 Graph Query API**
  - **Requirements**: `GET /lineage/table/{fqn}`, `GET /lineage/job/{job_id}`.
  - **Test**: Verify graph response includes all related nodes within depth limit.

---

## 🟣 Phase 5: Audit & Console Integration

**Goal**: System visibility and operational logging.

- [x] **5.1 Audit Log API**
  - **Requirements**: `GET /audits`.
  - **Test**: Execute a legacy command, verify entry in `audit_log`.

- [x] **5.2 Legacy Console Support**
  - **Requirements**: Serve `app/static`. Ensure API V2 path doesn't conflict.
  - **Test**: Access `/static/index.html`.

- [x] **5.3 Final Verification: Docker E2E**
  - **Requirements**: Run `make dev`. Verify connectivity to MySQL/Redis and check `/api/v2/health`.
  - **Test**: Use `curl` to verify health check in dev environment.

---

## ⚪ Phase 6: Integration & Cleanup

**Goal**: Final polish and integration with the wider platform.

- [ ] **6.1 Event Publishing**
  - **Requirements**: Publish `JOB_CREATED`, `GRAPH_UPDATED` events to Redis.
  - **Test**: Use `redis-cli monitor` to see events during API calls.

- [ ] **6.2 Migration Verification**
  - **Requirements**: Verify all data from V1 (if any) works in V2.
  - **Test**: End-to-end smoke test.

---

## 🔵 Phase 7: Refactoring & Architecture Patterns (Completed)

**Goal**: Enhance maintainability, testability, and scalability through modern architecture patterns.

- [x] **7.1 Refactor with Dependency Injection (DI)**
  - **Requirements**: Integrate `dependency-injector` library. Created `Container` in `app/core/container.py` for managing service and infrastructure lifecycles.
  - **Test**: API endpoints successfully receive injected services via `Depends(Provide[...])`.

- [x] **7.2 Service Layer Implementation**
  - **Requirements**: Implemented `GraphService`, `MetadataService`, and `AuditService`. Business logic and implicit UoW/transaction management moved from API layer to services.
  - **Test**: All core endpoints (projects, jobs, tables, lineage, audits) verified with service calls.

- [x] **7.3 Domain Separation (Graph vs Metadata)**
  - **Requirements**: Structural separation of the `graph` domain (connectivity: `JobNode`, `DataNode`) and `metadata` domain (rich attributes: `TableMetadata`).
  - **Test**: Repositories and models aligned with the new domain boundaries.

- [x] **7.4 Coding Guidelines & Pattern Documentation**
  - **Requirements**: Formalized DDD, DI, and UoW patterns into the project's [Design Specification](./design-lineage-manager-v2-spec.md).
  - **Test**: Document updated with Section 16 (Coding Guidelines).

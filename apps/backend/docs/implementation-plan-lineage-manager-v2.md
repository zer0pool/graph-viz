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

- [ ] **2.1 Domain Entities**
  - **Requirements**: Create dataclasses in `app/domain/` for `Project`, `User`, `Job`, `Table`, `AuditLog`. Ensure `job_id` property logic is correct.
  - **Reference**: Design Spec Section 3.1 & 3.2.
  - **Test**: Unit tests for Entity creation and property logic.

- [ ] **2.2 Infrastructure Models (SQLAlchemy)**
  - **Requirements**: Map existing Alembic tables (`project`, `user_account`, `job_owner`, `audit_log`) to SQLAlchemy ORM models in `app/infrastructure/models.py`.
  - **Test**: Verify model fields match DB schema exactly.

- [ ] **2.3 Repositories**
  - **Requirements**: Implement `ProjectRepository`, `UserRepository`, `JobRepository`, `AuditRepository`. Support basic CRUD and list by owner/project.
  - **Reference**: Design Spec Section 3.2.
  - **Test**: Integration test - Save a Job, Retrieve it, Verify fields.

- [ ] **2.4 Unit of Work (UoW)**
  - **Requirements**: Implement `UnitOfWork` class to manage transaction boundaries.
  - **Test**: Test transactional integrity (rollback on error).

---

## 🟠 Phase 3: Resource APIs (REST)

**Goal**: Expose authoritative metadata through RESTful endpoints.

- [ ] **3.1 Project & User Endpoints**
  - **Requirements**: `GET /projects/{id}/jobs`, `GET /users/{id}/jobs`.
  - **Reference**: Design Spec Section 4.8.
  - **Test**: `pytest` for API responses using correct JSON structure.

- [ ] **3.2 Job CRUD Endpoints**
  - **Requirements**: `POST /jobs` (Create), `GET /jobs/{job_id}`, `PUT /jobs` (Update status/schedule).
  - **Test**: Create a job via API, verify it appears in `GET /projects/...`.

- [ ] **3.3 Table Endpoints**
  - **Requirements**: `POST /tables`, `GET /tables/{fqn}`.
  - **Test**: Create a table node, retrieve by FQN.

---

## 🔵 Phase 4: Lineage Logic & Graph Processing

**Goal**: Handle complex graph operations (Ingestion and Traversal).

- [ ] **4.1 Ingestion Service**
  - **Requirements**: Implement `GraphService.ingest_graph(payload)`. Parse nodes/edges and persist via UoW.
  - **Test**: Ingest a sample DAG (A -> B -> C), verify 3 nodes and 2 edges in DB.

- [ ] **4.2 Graph Traversal Endpoint**
  - **Requirements**: `GET /lineage/graph`. Implement BFS/DFS traversal for Upstream/Downstream.
  - **Reference**: Design Spec Section 4.4.
  - **Test**: Request lineage for 'Node B', expect 'Node A' (upstream) and 'Node C' (downstream).

- [ ] **4.3 Async Graph Initialization (Celery)**
  - **Requirements**: Setup Celery worker. Implement `POST /graph/init` task.
  - **Test**: Trigger init, check Celery logs for execution.

---

## 🟣 Phase 5: Security & Audit

**Goal**: Secure the application and track all mutations.

- [ ] **5.1 Audit Logging Inteceptor**
  - **Requirements**: Automatically create `AuditLog` entry on `POST/PUT/DELETE` methods defined in service layer.
  - **Test**: Call `POST /jobs`, verify a row in `audit_log` table.

- [ ] **5.2 API Security**
  - **Requirements**: Integrate dependency injection for User Context (mock or real JWT).
  - **Test**: Verify unprotected access fails (if auth enabled).

---

## ⚪ Phase 6: Integration & Cleanup

**Goal**: Final polish and integration with the wider platform.

- [ ] **6.1 Event Publishing**
  - **Requirements**: Publish `JOB_CREATED`, `GRAPH_UPDATED` events to Redis.
  - **Test**: Use `redis-cli monitor` to see events during API calls.

- [ ] **6.2 Migration Verification**
  - **Requirements**: Verify all data from V1 (if any) works in V2.
  - **Test**: End-to-end smoke test.

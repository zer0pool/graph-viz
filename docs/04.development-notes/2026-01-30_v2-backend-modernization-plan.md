# 2026-01-30: Lineage Manager V2 Modernization Plan

## 📌 Context & Rationale
After a deep-dive analysis of the existing `lineage-manager` (V1) codebase, we have decided to **Freeze V1** and initiate a **Greenfield V2** construction.

**Why not refactor?**
- **Async Transformation**: Converting the entire sync DB/Service chain to `async` is high-risk and prone to "Sync/Async coloring" bugs.
- **Architectural Debt**: V1 uses a layered structure. Moving to DDD requires a total overhaul of the directory structure and class dependencies.
- **Velocity**: Starting fresh with the approved `FastAPI DDD Template` is faster than surgically removing technical debt from V1.

---

## 🏗️ V2 Architectural Standards

### 1. Domain-Driven Design (DDD)
- Group logic by domain instead of layer (e.g., `app/domain/graph/`, `app/domain/audit/`).
- Each domain contains its own `models.py`, `schemas.py`, `repository.py`, and `service.py`.

### 2. Full Asynchronous Stack
- **Framework**: FastAPI (Async).
- **ORM**: SQLAlchemy 2.0 (Async engine + AsyncSession).
- **Data Access**: Everything from API entry to DB commit must be `awaitable`.

### 3. Unit of Work (UoW) Pattern
- Transaction management is strictly handled by the UoW in Orchestration services.
- Repositories and Command services are stateless and do not manage commits.

---

## 🎨 Standalone UI Strategy
While the MFE ecosystem is the primary interface, V2 will retain and modernize the **Standalone Internal Viewer**.

### Objectives
- **Standalone Resilience**: Ensure the backend remains useful even if the MFE shell is unavailable.
- **Lean Architecture**: Refactor `static/js` to be a lightweight, modern viewer using ES6 modules.
- **Aesthetic Alignment**: Update designs to match the premium "Wow" look of the modern MFEs.

### Key Refactor Points
- **API Sync**: Update all Fetch calls to match V2 Async Endpoints.
- **Logic Extraction**: Move graph processing (Folding/Expand) from the UI thread to clean utility classes.
- **Branding**: Implement a unified design system across standalone and MFE views.

---

## 🔄 Migration Strategy (Strangler Fig)

1. **Initialize V2**: Setup the baseline using the `FastAPI DDD Template`.
2. **Core Ingestion**: Migrate `GraphSyncService` and `JobManagerAdapter` first (The "Brain").
3. **Internal Viewer Refactor**: Update the Standalone UI to work with V2 APIs.
4. **Endpoint Cutover**: Gradually point Nginx/MFE to V2 for specific domains (Graph -> Audit -> Search).
5. **Decommission V1**: Once parity is reached, archive V1.

---

## ✅ Success Metrics
- 100% Async Coverage in Backend.
- Zero Business Logic Leakage in Routers/Controllers.
- Standalone UI operational with zero legacy DOM manipulation dependencies.
- Unit Test Coverage > 80% using DI & Mocking.

---

_Author: David & Antigravity (Capsule Corp)_
_Date: 2026-01-30_

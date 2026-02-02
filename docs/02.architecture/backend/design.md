---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.1
related: [../system-overview.md, endpoints.md]
tags: [backend, architecture, design, mysql]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.1
Status: Shipped
Title: Lineage Manager: Backend Architecture Design

Summary:
Defines the core design of the Lineage Manager backend, including the data layer (MySQL + Closure Tables), dependency injection patterns, and API orchestration logic.

---

## 🏗️ System Overview

The **Lineage Manager** is a FastAPI-based backend service designed to manage and analyze dependency graphs (lineage) for data pipelines. It provides RESTful endpoints for graph exploration, impact analysis, and synchronization.

## 📦 Core Components

### 1. Graph Engine
- **DAG Implementation**: Managed via relational models and Closure Tables.
- **Traversal logic**: Optimized pathfinding using ancestor/descendant relationships.
- **Closure Tables**: Stores all paths (ancestor-descendant pairs) to enable efficient hierarchical queries without complex recursive SQL.

### 2. Data Layer (Relational MySQL)
The system uses MySQL 8 as its primary data store.

#### Schema Overview
- **`job_account`**: Stores job metadata (id, label, owner, schedule).
- **`table_account`**: Stores table/dataset metadata.
- **`job_edge`**: Defines direct dependencies between jobs and tables.
- **`job_closure`**: The closure table for high-performance dependency lookups.

### 3. Application Layer (Logic & Patterns)
- **Dependency Injection**: Uses `python-dependency-injector` for loose coupling between repositories and services.
- **Repository Pattern**: Abstracting DB operations via `GraphRepository` and `JobRepository`.
- **Unit of Work**: Managed via `GraphUnitOfWork` to ensure transactional integrity across multiple operations.

### 4. API Layer
- **FastAPI**: Provides high-performance, asynchronous endpoints.
- **Pydantic V2**: Used for strict data validation and serialization.
- **OpenAPI**: Automatic documentation available at `/docs`.

## 🛠️ Technology Stack

- **Framework**: FastAPI (Python 3.10+)
- **Database**: MySQL 8 (using SQLAlchemy 2.0)
- **Migrations**: Alembic
- **Caching**: Redis (Optional, for heavy graph queries)
- **Testing**: Pytest + TestContainers (for integration)

## 🔄 Key Workflows

### 1. Graph Query Workflow
1. Client requests lineage for `target_id`.
2. `GraphQueryService` identifies immediate neighbors via `job_edge`.
3. High-level analysis (full upstream/downstream) utilizes the `job_closure` table.
4. Data is serialized into a **Mermaid DSL** or compatible JSON format (removed legacy Cytoscape).

### 2. Data Synchronization
- External triggers periodically update job/table states via the `/sync` endpoints.
- Transactional safety is maintained to ensure the graph remains a valid DAG.
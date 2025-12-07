# architecture-overview.md
System Architecture Overview — Lineage Manager

## 1. Purpose
This document explains the full structure of the Lineage Manager platform: backend modules, frontend UI, data flow, and deployment architecture.

## 2. High-Level System Diagram
User → Frontend (Cytoscape Graph, Panels)  
→ Backend API (FastAPI + DI Containers)  
→ MySQL (Metadata, Closure Table)  
→ BigQuery (Source lineage data)  
→ Redis (Optional caching)

## 3. Backend Architecture
- **API layer**: FastAPI routers
- **Service layer**: Business logic, stateless
- **Repository layer**: Database access via SQLAlchemy
- **DI Containers**: Inject services/repositories/session

### Data Flow
Request → Router → Service → Repository → MySQL  
Service → DTO → Response → Frontend

## 4. Frontend Architecture
- **GraphController**: manages Cytoscape instance and layout logic
- **Panels**: left (controls), right (details)
- **States**: selectionState, filterState, graphData
- **API Client**: fetches lineage graph data and details

## 5. Deployment Architecture (GKE)
- Docker images for backend + frontend static assets
- Helm charts configure pods, services, ingress
- ConfigMaps store environment settings
- Rolling update deployment model

## 6. Key Components Summary
- Graph rendering engine  
- Lineage query engine  
- Trigger-table management  
- Upstream/Downstream expansion  

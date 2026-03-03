# Analysis: Job Detail Page Implementation

**Date**: 2026-03-02  
**Target URL**: `http://localhost:5100/admin-console/jobs/{jobId}`  
**Scope**: Frontend components and Backend API orchestration for the Job Detail view.

## 1. Overview
The Job Detail page provides a comprehensive view of a single data pipeline job, including its metadata, execution history, and lineage dependencies. It is implemented as a modular feature within the `mfe-catalog` micro-frontend.

## 2. Frontend Architecture (mfe-catalog)

### 2.1 Component Structure
The page follows a standard Pattern: **Page Wrapper -> Logic Hook -> Presenter -> Sub-components**.

- **Entry Point**: `JobDetailView.tsx` (src/pages/job/)
    - Handles route parameters and initializes the logic hook.
- **Logic Hook**: `useJobDetailView.ts` (src/widgets/job-detail/)
    - Manages local state (active tab, selected run for drawer).
    - Orchestrates data fetching via multiple entity hooks.
- **Presenter**: `JobDetailViewPresenter.tsx` (src/widgets/job-detail/)
    - Defines the high-level layout using `DetailLayout` or `CompactDetailLayout`.
    - Renders the header (`EntityHeader`) and delegates tab content to specific widgets.

### 2.2 Main View Tabs
| Tab | Component | Description |
| :--- | :--- | :--- |
| **Summary** | `JobOverview` | Displays job profile, schedule, and execution status properties. |
| **Lineage** | `JobLineage` | Shows health metrics, upstream inputs, downstream outputs, and graph link. |
| **Run History** | `JobRunTimeline`, `JobRunHistory` | Visualizes the execution gantt-chart and a detailed history table. |

### 2.3 Additional UI Elements
- **Run Detail Drawer**: `JobRunDrawer` - A slide-over component that displays logs and metadata for a specific execution run.
- **Project Context**: A section showing "Other Jobs in Project" to allow easy navigation within the same domain.

## 3. Backend API Interaction

All data fetching is performed through the `ApiClient` (src/shared/api/api.ts), which communicates with the `lineage-manager` (REST) and `analytics-manager` (GraphQL/REST).

### 3.1 Primary Endpoints
| Feature | API Endpoint | Method | ApiClient Method |
| :--- | :--- | :--- | :--- |
| **Job Info** | `/api/v1/jobs/{jobId}` | GET | `fetchJobDetail` |
| **Run History** | `/api/v1/jobs/{jobId}/run-history` | GET | `fetchJobRunHistory` |
| **Job Health** | `/api/v1/jobs/{jobId}/health` | GET | `fetchJobHealth` |
| **Lineage** | `/api/v1/jobs/{jobId}/lineage` | GET | `fetchJobLineageHybrid` |
| **Project Context** | `/api/v1/projects/{projectId}/jobs` | GET | `fetchProjectJobs` |

### 3.2 Data Flow
1.  **Initial Load**: `useJobOverview` and `useJobRunHistory` are triggered on page mount.
2.  **Context Load**: Once job metadata is returned, `useProjectJobs` is triggered using the `project_id`.
3.  **Lineage Fetch**: When the user switches to the **Lineage** tab (or on mount), `JobLineage` independently fetches health and dependency data in parallel.

## 4. Key Implementation Files
- **Page Entry**: [JobDetailView.tsx](file:///home/darkwing/src/lineage_platform/apps/frontend/mfe-catalog/src/pages/job/JobDetailView.tsx)
- **Logic**: [useJobDetailView.ts](file:///home/darkwing/src/lineage_platform/apps/frontend/mfe-catalog/src/widgets/job-detail/useJobDetailView.ts)
- **UI Presenter**: [JobDetailViewPresenter.tsx](file:///home/darkwing/src/lineage_platform/apps/frontend/mfe-catalog/src/widgets/job-detail/JobDetailViewPresenter.tsx)
- **API Client**: [api.ts](file:///home/darkwing/src/lineage_platform/apps/frontend/mfe-catalog/src/shared/api/api.ts)

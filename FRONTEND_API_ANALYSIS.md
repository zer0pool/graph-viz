# Frontend Landing Page API Analysis

## 📊 Dashboard Page API Requirements

### **API Calls from Frontend**

The Dashboard page (`DashboardPage.tsx`) makes the following API calls:

1. **`GET /api/v1/analytics/dashboard-metrics`**
   - **Purpose**: Fetch KPI metrics for the summary grid
   - **Data Returned**:
     - `total_tables`: Number of tables across all schemas
     - `total_jobs`: Number of active jobs (with breakdown by job type)
     - `total_users`: Total number of users
     - Additional metrics (alerts, ingestion volume, etc.)
   - **Used By**: `useDashboardMetrics` hook
   - **File**: `src/shared/lib/hooks/useDashboardMetrics.ts`

2. **`GET /api/v1/analytics/top-visited`**
   - **Purpose**: Fetch most visited pages/resources
   - **Data Returned**:
     - `items[]`: Array of visited items with path, title, count
     - `window_hours`: Time window for the statistics (e.g., last 4 hours)
   - **Used By**: `useAnalyticsData` hook
   - **File**: `src/shared/lib/hooks/useAnalyticsData.ts`

---

## ✅ Current Implementation Status

### **Lineage Manager (Port 5003)**

Currently implemented endpoints:
```
GET    /lineage-manager/api/v1/audits/
GET    /lineage-manager/api/v1/graph/diagnose
GET    /lineage-manager/api/v1/health
GET    /lineage-manager/api/v1/jobs/
GET    /lineage-manager/api/v1/jobs/{job_id}
GET    /lineage-manager/api/v1/lineage/graph/job/{job_id}
GET    /lineage-manager/api/v1/lineage/graph/table/{fqn:path}
GET    /lineage-manager/api/v1/projects/
GET    /lineage-manager/api/v1/projects/{project_id}
GET    /lineage-manager/api/v1/projects/{project_id}/jobs
GET    /lineage-manager/api/v1/resources/{fqn:path}
GET    /lineage-manager/api/v1/users/{user_id}/jobs
POST   /lineage-manager/api/v1/commands/send-email
POST   /lineage-manager/api/v1/graph/init
POST   /lineage-manager/api/v1/jobs/
POST   /lineage-manager/api/v1/jobs/{job_id}/pause
POST   /lineage-manager/api/v1/jobs/{job_id}/resume
POST   /lineage-manager/api/v1/lineage/register
POST   /lineage-manager/api/v1/projects/
POST   /lineage-manager/api/v1/resources/
```

### **Analytics Manager (Port 5002)**

Currently: **NOT IMPLEMENTED** (no backend service exists yet)

---

## ❌ Missing Implementations

### **1. Dashboard Metrics API**
**Endpoint:** `GET /api/v1/analytics/dashboard-metrics`

**Status:** ❌ **NOT IMPLEMENTED**

**Expected Response:**
```json
{
  "metrics": [
    {
      "type": "total_tables",
      "value": 1234,
      "subtext": "Across all schemas"
    },
    {
      "type": "total_jobs",
      "value": 567,
      "subtext": "Active Jobs",
      "breakdown": [
        { "label": "Self-Type", "value": 400, "color": "bg-blue-600" },
        { "label": "Request-Type", "value": 167, "color": "bg-amber-500" }
      ]
    },
    {
      "type": "total_users",
      "value": 89,
      "subtext": "Total Users"
    }
  ]
}
```

### **2. Top Visited API**
**Endpoint:** `GET /api/v1/analytics/top-visited`

**Status:** ❌ **NOT IMPLEMENTED**

**Expected Response:**
```json
{
  "items": [
    {
      "path": "/jobs/project.dataset.job_name",
      "title": "Daily ETL Pipeline",
      "count": 45
    },
    {
      "path": "/tables/project.dataset.table_name",
      "title": "Customer Transactions",
      "count": 38
    }
  ],
  "window_hours": 4
}
```

---

## 🎯 Service Responsibility Assignment

### **Analytics Manager** (Port 5002) - **RECOMMENDED**

Both missing APIs should be implemented in a **new Analytics Manager service**:

#### **Rationale:**

1. **Separation of Concerns**
   - **Lineage Manager**: Handles lineage graph, jobs, projects, resources (core data catalog)
   - **Analytics Manager**: Handles analytics, usage tracking, visit statistics, KPIs

2. **Scalability**
   - Analytics queries can be resource-intensive (aggregations, time-series data)
   - Separating allows independent scaling of analytics workload

3. **Data Ownership**
   - Visit tracking and analytics data is conceptually different from lineage metadata
   - Analytics Manager can have its own database/cache for analytics data

4. **Future Extensibility**
   - Easy to add more analytics endpoints:
     - User activity trends
     - Resource usage patterns
     - Performance metrics
     - Custom dashboards

#### **Endpoints to Implement:**

```
Analytics Manager (Port 5002):
├── GET  /analytics-manager/api/v1/health
├── GET  /analytics-manager/api/v1/analytics/dashboard-metrics
├── GET  /analytics-manager/api/v1/analytics/top-visited
├── POST /analytics-manager/api/v1/analytics/track-visit (future)
└── GET  /analytics-manager/api/v1/analytics/user-activity (future)
```

---

## 🔄 Alternative: Lineage Manager Implementation

If you prefer to keep everything in one service initially:

### **Lineage Manager** (Port 5003)

**Pros:**
- Simpler deployment (one service)
- Can reuse existing database connections
- Faster initial development

**Cons:**
- Mixes concerns (lineage + analytics)
- Harder to scale independently
- More complex codebase over time

**Endpoints:**
```
Lineage Manager (Port 5003):
├── GET /lineage-manager/api/v1/analytics/dashboard-metrics
└── GET /lineage-manager/api/v1/analytics/top-visited
```

---

## 📝 Implementation Requirements

### **Dashboard Metrics API**

**Data Sources:**
- `total_tables`: Count from `data_node` table where `data_type IN ('TABLE', 'STORAGE')`
- `total_jobs`: Count from `job_node` table
- `total_users`: Count from `user_account` table
- `job_breakdown`: Group jobs by `properties->>'job_type'` or similar field

**SQL Example:**
```sql
-- Total tables
SELECT COUNT(*) FROM data_node WHERE data_type IN ('TABLE', 'STORAGE');

-- Total jobs
SELECT COUNT(*) FROM job_node;

-- Job breakdown
SELECT 
  properties->>'job_type' as job_type,
  COUNT(*) as count
FROM job_node
GROUP BY properties->>'job_type';

-- Total users
SELECT COUNT(*) FROM user_account;
```

### **Top Visited API**

**Data Source:**
- Requires a new `visit_tracking` table or Redis cache
- Schema:
  ```sql
  CREATE TABLE visit_tracking (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    title VARCHAR(255),
    user_id VARCHAR(100),
    visited_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_visited_at (visited_at)
  );
  ```

**Query Example:**
```sql
-- Top visited in last 4 hours
SELECT 
  path,
  title,
  COUNT(*) as count
FROM visit_tracking
WHERE visited_at >= NOW() - INTERVAL '4 hours'
GROUP BY path, title
ORDER BY count DESC
LIMIT 5;
```

---

## 🚀 Recommended Implementation Plan

### **Phase 1: Create Analytics Manager Service**

1. **Setup New Service**
   ```bash
   cd apps/backend
   cp -r lineage_manager_v2 metrics_manager
   cd metrics_manager
   # Update port to 5002
   # Update service name in config
   ```

2. **Update Configuration**
   - Port: 5002
   - API Prefix: `/analytics-manager/api/v1`
   - Database: Share with lineage_manager or use separate analytics DB

3. **Implement Endpoints**
   - `GET /analytics-manager/api/v1/health`
   - `GET /analytics-manager/api/v1/analytics/dashboard-metrics`
   - `GET /analytics-manager/api/v1/analytics/top-visited`

4. **Create Visit Tracking Table**
   ```sql
   CREATE TABLE visit_tracking (
     id SERIAL PRIMARY KEY,
     path VARCHAR(500) NOT NULL,
     title VARCHAR(255),
     user_id VARCHAR(100),
     session_id VARCHAR(100),
     visited_at TIMESTAMP DEFAULT NOW(),
     INDEX idx_visited_at (visited_at),
     INDEX idx_path (path)
   );
   ```

### **Phase 2: Update Frontend**

1. **Update API Base URLs**
   ```typescript
   // src/shared/api/analyticsApi.ts
   getDashboardMetrics: async () => {
     const response = await fetch(
       `${config.API_BASE_URL}/analytics-manager/api/v1/analytics/dashboard-metrics`
     );
     return response.json();
   },
   
   getTopVisited: async () => {
     const response = await fetch(
       `${config.API_BASE_URL}/analytics-manager/api/v1/analytics/top-visited`
     );
     return response.json();
   },
   ```

2. **Test with Webpack Proxy**
   - Already configured to route `/analytics-manager` to port 5002

### **Phase 3: Add Visit Tracking**

1. **Frontend Hook**
   ```typescript
   // Track page visits
   useEffect(() => {
     analyticsApi.trackVisit({
       path: location.pathname,
       title: document.title,
     });
   }, [location.pathname]);
   ```

2. **Backend Endpoint**
   ```python
   @router.post("/analytics/track-visit")
   async def track_visit(visit: VisitCreate, uow: UnitOfWork):
       await uow.analytics.track_visit(visit)
       await uow.commit()
   ```

---

## 📊 Summary Table

| API Endpoint | Status | Recommended Service | Priority | Complexity |
|--------------|--------|---------------------|----------|------------|
| `GET /analytics/dashboard-metrics` | ❌ Missing | **Analytics Manager** | 🔴 High | Medium |
| `GET /analytics/top-visited` | ❌ Missing | **Analytics Manager** | 🔴 High | Medium |
| `POST /analytics/track-visit` | ❌ Missing | **Analytics Manager** | 🟡 Medium | Low |

---

## 🎯 Final Recommendation

**Create a dedicated Analytics Manager service (Port 5002)** for the following reasons:

1. ✅ Clean separation of concerns
2. ✅ Independent scalability
3. ✅ Easier to add analytics features in the future
4. ✅ Matches the microservice architecture already in place
5. ✅ Frontend proxy configuration already supports it

This approach aligns with your existing architecture where you have:
- **Lineage Manager** (5003): Core data catalog and lineage
- **Analytics Manager** (5002): Analytics and usage tracking
- **Frontend** (5100): User interface orchestration

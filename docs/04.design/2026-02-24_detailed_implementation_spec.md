# Detailed Technical Specification: Unified GraphQL API
Related Docs: [High-level Design: Unified GraphQL API](2026-02-23_unified_metrics_api_design.md)

## 1. Backend: Lineage Manager Internal Stats API

`lineage-manager` will expose a consolidated stats endpoint for operational data.

- **Endpoint**: `GET /api/internal/v1/stats`
- **Response Structure**:
```json
{
  "jobs": {
    "total": 150,
    "status_counts": {
      "DEPLOYED": 140,
      "RUNNING": 5,
      "FAILED": 5
    },
    "type_counts": {
      "SELF-TYPE": 100,
      "REQUEST-TYPE": 50
    }
  },
  "tables": {
    "total": 850,
    "source_counts": {
      "BIGQUERY": 800,
      "EXTERNAL": 50
    }
  },
  "users": {
    "total": 45,
    "active_24h": 12
  }
}
```

## 2. Backend: Analytics Manager GraphQL Schema (Cloudflare Style)

### 2.1 Types
```python
@strawberry.type
class MetricDimensions:
    type: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None
    name: Optional[str] = None  # Used for Top N identity

@strawberry.type
class TrendPoint:
    time: str
    value: float
    series: Optional[str] = None  # e.g., "2025" or "2026"

@strawberry.type
class MetricGroups:
    count: Optional[int] = None
    sum: Optional[float] = None
    avg: Optional[float] = None
    status: str = "default"
    label: Optional[str] = None
    dimensions: Optional[MetricDimensions] = None
    history: Optional[List[TrendPoint]] = None
```

### 2.2 Unified Landing Page Query
```graphql
query GetLandingPage($context: LandingPageContext!, $filter: MetricFilter) {
  landingPage(context: $context) {
    # Layer 1: Simple Metrics (Aggregated Groups)
    topMetrics(ids: ["total_jobs", "failed_24h"]) {
      label count status
    }
    
    # Layer 2: Complex Metrics (Dimensions & History)
    analytics(ids: ["job_type_breakdown", "active_users_yoy"]) {
      label
      dimensions { type name }
      sum
      history { time value series }
    }
    
    # Layer 3: List Data (Relay Connection)
    entities(first: 10, after: $cursor) {
      totalCount
      edges {
        node { id displayLabel updatedAt }
        cursor
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

## 3. Metric Registry Mapping (Analytics Manager)

| Metric ID | Layer | Cloudflare-style Resolution |
| :--- | :--- | :--- |
| `total_jobs` | Simple | `MetricGroups(count=...label="Total Jobs")` |
| `active_users_yoy` | Complex | `MetricGroups(label="YoY MAU", history=[...series="2025", ...series="2026"])` |
| `top_jobs_by_slots` | Complex | `List[MetricGroups(dimensions=MetricDimensions(name="job_x"), sum=123.4)]` |

---

## 4. Frontend Integration: `useLandingPageData`

A centralized hook will handle the GraphQL orchestration:
```typescript
const { metrics, plots, tableData, loading } = useLandingPageData('jobs', {
  limit: 10,
  offset: 0,
  filter: { status: 'FAILED' }
});
```
This hook will abstract the complexity of switching between standard cards (`SummaryGrid`) and specialized 2D plots (Trends/Top N).

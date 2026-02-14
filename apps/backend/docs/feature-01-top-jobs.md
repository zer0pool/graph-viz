# [Feature Spec] Feature-01: Top Rankings Dashboard (Jobs & Tables)

This document specifies the requirements and design for the top-ranking metrics for both Jobs and Tables.

---

## 1. Overview
The goal is to provide visibility into high-resource usage and high-traffic entities. These rankings help in cost optimization and system monitoring.

- **Job Rankings**:
  - **KPI 1**: Top 30 Jobs by Slot Usage (Resource consumption).
  - **KPI 2**: Top 30 Jobs by Execution Duration (Time performance).
- **Table Rankings**:
  - **KPI 3**: Top 30 Tables by Daily Ingestion (Highest record append counts).

## 2. Data Strategy

### 2.1 Sources
- **BigQuery**: 
  - Job metrics: `total_slot_ms`, `duration`.
  - Table metrics: `row_count_delta` (Daily ingestion monitoring via audit logs or info schema).
- **lineage-manager**: Metadata enrichment (`job_name`, `table_name`, `owner`, `project`).

### 2.2 Freshness & Caching
- **Standard Cache**: Results are cached in Redis for **2 hours (7200s)**.
- **Force Refresh**: Frontend can bypass cache via a `forceRefresh` flag to trigger an immediate BigQuery re-query.
- **Data Freshness**: Every response includes `updatedAt` to inform the user when the data was last calculated.

## 3. Class Design
Following the Single Responsibility Principle (SRP), separate handlers manage each metric:
- `GetTopSlotUsageQuery`: Logic for aggregating and sorting by slot consumption.
- `GetTopDurationQuery`: Logic for identifying the longest-running executions.
- `JobMetadataService`: A shared utility to fetch metadata from `lineage-manager` to enrich raw BigQuery IDs.

## 4. GraphQL Interface

```graphql
type JobMetricNode {
  jobId: String!
  jobName: String
  owner: String
  project: String
  slotUsage: Float
  durationSeconds: Int
}

type TableMetricNode {
  tableId: String!
  tableName: String
  project: String
  owner: String
  dailyIngestionRows: BigInt!
  updatedAt: DateTime!
}

type MetricsResponse {
  items: [JobMetricNode!]!
  updatedAt: DateTime!
  isFromCache: Boolean!
}

type TableMetricsResponse {
  items: [TableMetricNode!]!
  updatedAt: DateTime!
  isFromCache: Boolean!
}

extend type Query {
  topSlotUsageJobs(limit: Int = 30, forceRefresh: Boolean = false): MetricsResponse!
  topDurationJobs(limit: Int = 30, forceRefresh: Boolean = false): MetricsResponse!
  topTableIngestion(limit: Int = 30, forceRefresh: Boolean = false): TableMetricsResponse!
}
```

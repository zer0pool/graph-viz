# [Feature Spec] Feature-02: Job Run History & Advanced Filtering

This document defines the requirements and technical design for the Job Explorer, similar to the GCP Console Job Explorer.

---

## 1. Scope
The Job Explorer provides a comprehensive, searchable list of all past job executions, allowing operators to troubleshoot failures and analyze historical performance.

- **Scale**: ~10,000 unique jobs with daily/hourly execution frequencies, leading to millions of rows in BigQuery.
- **Ordering**: Strict reverse-chronological order (Latest First).

## 2. Requirements

### 2.1 Filtering Capabilities
The system must support complex filtering on the following dimensions:
- **Identity**: `owner`, `job_id`, `project_name`.
- **Status**: `run_result` (Success, Failed, Cancelled).
- **Time Range**: `start_date` and `end_date` (Absolute date range filtering).

### 2.2 Performance & Scalability
Due to the high volume of execution data:
- **Pagination**: Results must be paginated (Offset/Limit or Cursor-based).
- **BigQuery Optimization**: Queries must leverage partitioned columns (typically partitioned by execution date) to minimize scan costs.
- **Asynchronous Enrichment**: Identifiers from BigQuery are enriched with metadata from `lineage-manager`.

## 3. GraphQL Schema Design

A structured input object is used to handle various filter combinations cleanly.

```graphql
input JobHistoryFilter {
  owner: String
  jobId: String
  projectName: String
  status: String
  startDate: DateTime
  endDate: DateTime
}

type JobExecutionNode {
  runId: String!
  jobId: String!
  jobName: String
  project: String
  owner: String
  startTime: DateTime!
  endTime: DateTime
  duration: Int
  status: String!
  slotUsage: Float
}

type JobHistoryConnection {
  items: [JobExecutionNode!]!
  totalCount: Int!
  hasNextPage: Boolean!
  updatedAt: DateTime!
}

extend type Query {
  jobRunHistory(
    filter: JobHistoryFilter
    limit: Int = 50
    offset: Int = 0
  ): JobHistoryConnection!
}
```

## 4. Implementation Strategy

### 4.1 Query Construction
- The `GetJobHistoryQuery` class will dynamically build the BigQuery Standard SQL `WHERE` clause based on the provided `JobHistoryFilter`.
- Mandatory `date_range` limits should be enforced if none are provided, to prevent full table scans.

### 4.2 Metadata Enrichment (lineage-manager)
- Because `lineage-manager` is the owner of metadata (Job Name, Owner Team), the `metrics-manager` will perform a batch lookup of job IDs retrieved from the history query to fill in human-readable details.

### 4.3 Caching Strategy
- **Short-term Result Cache**: Cached for **5 minutes** per unique filter combination to handle UI paging/refreshes.
- **Metadata Cache**: Job metadata (ID -> Name/Owner) is cached for **1 hour** as it changes less frequently than execution status.

## 5. UI/UX Considerations (GCP Explorer Style)
- **Data Freshness Indicator**: Displaying the `updatedAt` timestamp prominently.
- **Polling vs. Refresh**: Support for manual refresh (triggers `forceRefresh: true`) rather than constant polling to save BigQuery costs.

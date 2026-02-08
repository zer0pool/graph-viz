# Lineage Page Architecture Document v1.0

## 1. Overview & Purpose 

The Lineage page is serving the following core purposes:

*   ✅ **Operational Judgment**: Instantly assess the current health of the job.
*   ✅ **Impact Analysis**: Understand the downstream impact of failures.
*   ✅ **Quality Monitoring**: Monitor data quality and freshness of inputs/outputs.

## 2. Page Structure

The page is structured to allow operators to intuitively assess the situation:

```text
┌───────────────────────────────────────────────────┐
│ 1. Job Header (Name / ★ / Status / Sync)          │
│    - Basic Identity & Sync Action                 │
└───────────────────────────────────────────────────┘

[ 2. Health Panel ]  ⭐ Core (Job Status)
─────────────────────────────────────────────────────

[ 3. Input Tables Section ]   ⬆ Upstream (Inputs)
─────────────────────────────────────────────────────

[ 4. Output Tables Section ]  ⬇ Downstream (Outputs)
─────────────────────────────────────────────────────

[ 5. Lineage Graph ]          ▶ Optional (Visualization)
─────────────────────────────────────────────────────
```

---

## 3. Component Details

### 2.1 Job Health Panel (Job Level)
*Answer: "Is this job healthy right now?"*

| Area | Item | Description | Example |
|:---:|:---:|:---|:---|
| **Freshness & SLA** | **Last Updated** | Latest data timestamp | `02:01` |
| | **Expected By** | SLA Deadline | `03:00` |
| | **Delay** | Time delayed (+ indicates delay) | `+59m` |
| **Last Run** | **Result** | Execution Result (Pass/Fail) | `✅ Success` |
| | **Duration** | Execution Duration | `12m 32s` |
| | **Ended At** | Completion Time | `02:03` |
| **Execution** | **Mode** | Execution Mode | `Incremental` |
| | **Partition** | Partition Condition | `dt=2026-02-07` |

### 2.2 Input Tables Section (Upstream)
*Answer: "What is the status of the data this job reads?"*

| Column | Required | Meaning | Example |
|:---|:---:|:---|:---|
| **Table Name** | ⭕ | Table Name (Link to Detail) | `raw_log` |
| **Storage** | ⭕ | Storage Type | `BQ`, `S3` |
| **Read Mode** | ⭕ | Read Strategy | `Inc` (Incremental), `Full` |
| **Last Updated**| ⭕ | Data Refresh Time | `02:01` |
| **Quality** | ⭕ | Data Quality Status | `✅`, `⚠` |
| **Records** | ⭕ | Recent Row Count | `12M` |
| **Owner** | ⭕ | Owning Team/User | `DE Team` |
| **Impact** | ⭕ | Criticality/Incident Grade | `🔴` (Critical) |

> **Hover Tooltip (Table Name)**: Schema Preview, Description, Storage Path, Slack Channel

### 2.3 Output Tables Section (Downstream)
*Answer: "Where does this job's output go, and what is the impact?"*

| Column | Required | Meaning | Example |
|:---|:---:|:---|:---|
| **Table Name** | ⭕ | Table Name (Link to Detail) | `summary_daily` |
| **Storage** | ⭕ | Storage Type | `BQ` |
| **Write Mode** | ⭕ | Write Strategy | `Merge`, `Append`, `Overwrite` |
| **Last Updated**| ⭕ | Write Completion Time | `02:03` |
| **Quality** | ⭕ | Output Data Quality | `⚠` (Warning) |
| **Size** | ⭕ | Table Size | `3TB` |
| **Users** | ⭕ | Downstream Job Count | `12` |
| **SLA** | ⭕ | Promised Delivery Time | `03:00` |

### 2.4 Lineage Graph (Optional)
*Answer: "Visual dependencies, only when needed."*

*   **Default**: Collapsed (Hidden)
*   **Toggle**: Activate via `[ ▶ Show Graph ]` button
*   **Function**: DAG (Directed Acyclic Graph) visualization, simple info on node click

---

## 4. Interaction & Behavior

### 4.1 Status Color Coding
*   **OK**: 🟢 Green
*   **Warning/Delay**: 🟡 Yellow
*   **Fail/Critical**: 🔴 Red

### 4.2 Drill Down (Navigation)
*   **Table Click** → Navigate to Table Detail Page
*   **Owner Click** → Navigate to User/Team Page
*   **Consumers (Users) Click** → Navigate to Impact Graph View

### 4.3 Refresh (Sync)
*   **Click Sync Button**
    1.  Clear Cache
    2.  Trigger Collector
    3.  Show `Refreshing...` indicator
    4.  Load fresh data

### 4.4 Initial Load
1.  Call API on page load.
2.  Show `LOADING` status (Skeleton UI recommended).
3.  Auto-refresh every 3s (Polling) - *Optional*.

---

## 5. Implementation Roadmap (MVP)

### Phase 1 (MVP - Immediate)
*   ✅ **Header**: Basic Info & Sync Button
*   ✅ **Health Panel**: Freshness, Last Run Status
*   ✅ **Input/Output Tables**: List View, Basic Metadata (Name, Storage, Updated, Owner)
*   ✅ **Refresh**: Manual Sync Feature
*   ✅ **Hover Info**: Table Schema Preview

### Phase 2 (Advanced)
*   ⬜ **SLA & Trend**: Hourly Trend Graph, SLA Compliance Rate
*   ⬜ **Quality Engine**: Detailed Data Quality Check Results integration
*   ⬜ **Prediction**: Estimated Completion Time Prediction Model

---

## 6. API Architecture (Split Model)

To optimize performance and separation of concerns, the data is fetched via two separate endpoints.

### 6.1 Health API (Fast Loading)
*   **Endpoint**: `GET /api/v1/jobs/{job_id}/health`
*   **Purpose**: Renders the **Health Panel**. Fetches real-time status, freshness, and SLA info.

```json
{
  "job_id": "payment.process_daily",
  "updated_at": "2026-02-08T02:10:00Z",
  "health": {
    "freshness": { "last_updated": "02:01", "sla": "03:00", "delay": 59 },
    "last_run": { "result": "SUCCESS", "duration": "12m", "ended_at": "02:03" },
    "execution": { "mode": "INCREMENTAL", "partition": "dt=2026-02-07" }
  }
}
```

### 6.2 Lineage API (Rich Data)
*   **Endpoint**: `GET /api/v1/jobs/{job_id}/lineage`
*   **Purpose**: Renders **Input/Output Tables** and **Graph**.
*   **Structure**: Hybrid model containing both list-view data and graph visualization data.

```json
{
  "job_id": "payment.process_daily",
  "inputs": [
    {
      "name": "raw_log",
      "storage": "BQ",
      "read_mode": "INC",
      "updated_at": "02:01",
      "quality_status": "PASS",
      "row_count": 12000000,
      "owner": "DE",
      "criticality": "HIGH"
    }
  ],
  "outputs": [
    {
      "name": "summary",
      "storage": "BQ",
      "write_mode": "MERGE",
      "updated_at": "02:03",
      "quality_status": "WARN",
      "size_bytes": 3298534883328,
      "consumer_count": 12,
      "sla": "03:00"
    }
  ],
  "graph": {
    "nodes": [
      { "id": "job:payment.process_daily", "type": "job", "status": "success" },
      { "id": "table:raw_log", "type": "table" }
    ],
    "edges": [
      { "source": "table:raw_log", "target": "job:payment.process_daily" }
    ]
  }
}
```

---

## 7. Data Collection Strategy & Logic

Detailed logic for calculating each health metric.

### 7.1 Quality (Data Quality Status)
*   **Strategy**: "Automated Rules + Result Caching" (MVP).
*   **Method (Rule-based)**:
    1.  **Row Count Drop**: `today_rows < yesterday_rows * 0.7` → **WARNING**
    2.  **Null Ratio**: `COUNTIF(col IS NULL) / COUNT(*) > 0.05` (5%) → **WARNING**
    3.  **Partition Check**: Missing expected partition → **FAIL**
*   **Future (Phase 2+)**: Integrate with Great Expectations, Soda, or Deequ.

### 7.2 Read Mode (Full / Incremental)
*   **Priority 1: Job Metadata (Best)**
    *   Explicitly define `"execution_mode": "INCREMENTAL"` in job config.
    *   Accuracy: 100%.
*   **Priority 2: SQL Pattern Analysis (Fallback)**
    *   Analyze `INFORMATION_SCHEMA.JOBS_BY_PROJECT`.
    *   **Incremental**: SQL contains `WHERE dt = '{{ ds }}'` or `_PARTITIONDATE`.
    *   **Full**: `FROM table` without partition filter.
*   **Priority 3: Partition Metadata**: Reading only the latest partition implies Incremental.

### 7.3 Write Mode (Append / Merge / Overwrite)
*   **Method**: Analyze SQL statement type or Job Config.
    *   **Append**: `INSERT INTO`
    *   **Merge**: `MERGE INTO`
    *   **Overwrite**: `CREATE OR REPLACE`
    *   **Config**: `"write_mode": "MERGE"`

### 7.4 Records (Recent Row Count)
*   **Method**: Query metadata (Cost-effective).
    ```sql
    SELECT row_count FROM INFORMATION_SCHEMA.TABLES
    ```
*   **Avoid**: `SELECT COUNT(*)` (High cost).

### 7.5 Last Updated
*   **Method**: `last_modified_time` from Table Metadata (BigQuery/S3).

### 7.6 Owner
*   **Method**: `table_catalog` owner field or Label (`labels.owner`).

### 7.7 Impact (Criticality)
*   **Method**: Hybrid (Manual + Rules).
*   **Rules**:
    *   `consumers > 10` → **HIGH**
    *   `sla < 1h` → **HIGH**
    *   Dataset `finance` or `payment` → **CRITICAL**

### 7.8 SLA / Expected Completion
*   **Method**:
    *   Job Config: `"sla_minutes": 60`
    *   Schedule-based: `Schedule Time + Average Duration + Buffer`

### 7.9 Consumers
*   **Method**: Count edges in Lineage Graph.
    ```sql
    SELECT COUNT(*) FROM edges WHERE source_table = ?
    ```

### 7.10 Storage Type
*   **Method**: Defined in source configuration (`source_type`: BQ, S3, Hive, etc.).

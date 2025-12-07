# domain-concepts.md
Domain Concepts — Lineage Manager

This document defines the core domain entities used throughout the Lineage Manager system.

---

# 1. Job
A **Job** represents a scheduled process that reads tables and writes tables.

### Attributes
- Job ID / Name
- Source tables (inputs)
- Destination tables (outputs)
- Execution schedule
- Trigger-table configuration

### Why Jobs Matter
Jobs define **operational lineage**: how data moves across tables through scheduled tasks.

---

# 2. Table
A **Table** is a logical data object in BigQuery or another database.

### Attributes
- Project / Dataset / Table name
- Partitioning scheme
- Storage metadata
- Last updated time

### Why Tables Matter
They represent the **nodes** in the lineage graph and act as the stable boundary for dependencies.

---

# 3. Storage

### Node Type Definitions

- **Table**
  - `node_type = "table"`
  - Maintains table-specific metadata  
    (e.g., schema, columns, partitioning)

- **Storage**  
  Physical or external storage systems such as S3, GCS, SFTP, Kafka, etc.
  - `node_type = "storage"`
  - Stored under `properties`:
    - `storage_kind`: `"s3"`, `"gcs"`, `"sftp"`, `"kafka"`, etc.
    - `storage_path`: bucket path or external location identifier  
    - `external_service_name` (optional): name of the external system managing the storage

### Edge Construction Rules
- Job → Table  
- Job → Storage  
- Table and Storage nodes are represented separately:  
  Tables maintain table-level metadata, whereas Storage nodes rely on `properties` for descriptive information.

### Design Rationale
- Clearly separates logical data objects (Tables) from physical storage objects (Storage).  
- Table nodes focus on schema- and query-level lineage.  
- Storage nodes represent file- or bucket-level lineage coming from external systems.
bucket-level data movement, complementing table-level logical lineage.

---

# 4. Upstream / Downstream
- **Upstream**: tables/jobs that produce data for the current entity  
- **Downstream**: tables/jobs that consume data from the current entity  

---

# 5. Closure Table
A specialized table storing all ancestor-descendant relationships with depth for fast lineage resolution.

---

# 6. Trigger Table
A table used as a signal for job execution.

---

# 7. Graph Expansion
Action that dynamically loads additional upstream/downstream dependencies into the graph.

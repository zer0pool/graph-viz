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

# 3. Storage (Logical vs Physical)
“Storage” refers to the *physical representation* or *materialized footprint* of a table.

Examples:
- BigQuery columnar storage  
- Parquet/ORC files  
- Materialized tables or partitions  

Storage differs from Table because:

## Table vs Storage Separation

### 1) Table = Logical, Storage = Physical
- Table defines schema, metadata, and logical lineage.
- Storage defines file layout, partitions, and cost-related metrics.

### 2) One Table → Many Storage Layers
- Logical view but no storage  
- Partitioned tables with multiple storage objects  
- Temporary or extracted storage layers

### 3) Advantages of separating Table and Storage
| Benefit | Explanation |
|--------|-------------|
| Clear lineage | Logical table lineage is easier to visualize |
| Performance optimization | Storage metadata enables cost analysis |
| Extensibility | Multiple storage formats can coexist |
| Operational clarity | Logical vs physical ownership separation |

### 4) Why Lineage Manager separates them
- Logical lineage graph ignores physical layout  
- BigQuery dry-run, slot cost, bytes processed → require storage metadata  
- Physical storage analytics does not affect logical dependencies  

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

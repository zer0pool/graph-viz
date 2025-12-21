# Table Detail Panel — Lineage Tab Design Specification v2

**Date:** 2025-12-21
**Last Modified:** 2025-12-21
**Author:** Lineage Manager Team
**Version:** 2.0 (Refined)
**Status:** Review

## 1. Overview & Purpose

The Lineage Tab is designed to be more than just a simple data flow visualization; it is a core tool for analyzing **Operational Impact** and **Data Provenance**.
Users should be able to use this tab to proactively identify risks associated with data changes and rapidly trace root causes in the event of an incident.

**Key Questions:**
*   **Upstream:** Where exactly did this data originate? (Source Root)
*   **Downstream:** If this table is modified, which reports or services will break? (Impact Analysis)
*   **Safety:** How far does sensitive information (e.g., PII) contained in this table propagate?

## 2. Design Principles

1.  **Read-first & Insight-first**
    *   Reduce cognitive load by presenting **Smart Insights (summary numbers)** like "How many tables are affected?" before showing the complex graph.
2.  **Explicit Exploration**
    *   Initially show only a manageable scope (Depth 1~2). Expand the exploration scope only through explicit user actions (e.g., expand buttons).
3.  **Operational Context over Structure**
    *   Prioritize showing **operational context** (e.g., "This job has an SLA", "This is an external report") over simple structural connectivity.

## 3. Layout Structure

```
Lineage Tab
 ├── [Header] Table Context (Name, Tags, Owner)
 ├── [Section A] Impact Summary (KPI Cards)
 ├── [Section B] Interactive Lineage Graph (Main Visualization)
 ├── [Section C] Impact Analysis List (Downstream/Leaf Details)
 └── [Section D] Provenance & Data Governance (Upstream/Source Roots)
```

## 4. Detailed Specifications

### 4.1 Header: Table Identity
*   **Table Name:** `project.dataset.table_name` (Copyable)
*   **Metadata:** Owner, Domain, Tags, Classification (e.g., `CONFIDENTIAL`)
*   **Quick Actions:**
    *   Open in Full Graph Explore
    *   Go to Dictionary / Catalog

### 4.2 Impact Summary (KPI Cards)
Key metrics to check first, before or while the graph loads.
*   **Upstream Depth:** Number of steps taken to generate this data.
*   **Downstream Impact:** Total number of downstream elements referencing this table.
*   **Leaf Nodes (Critical):** Number of end-points (Dashboards, Reports, External APIs) that ultimately consume this data. *Most critical metric.*

### 4.3 Interactive Lineage Graph
**Mermaid.js** based visualization area, enriched with interactive elements.
*   **Rendering Strategy:**
    *   Default `LR` (Left-to-Right) DAG layout.
    *   On initial load, fetch only `Upstream: 1` and `Downstream: 1` relative to the current node to ensure performance.
*   **Interaction Controls:**
    *   **Expand Buttons (+):** Clicking the left/right connection points of a node triggers a `Depth +1` expansion in that direction (re-calls API and regenerates Graph DSL).
    *   **Aggregation:** If node count exceeds a threshold, show as `+ N more`. Clicking expands that group.
    *   **Focus:** Clicking a node changes the subject of the Detail Panel to that node.
*   **Styling:**
    *   Distinct colors and icons for Node Types (Job vs Table).
    *   **Highlight Support:** Emphasize selected paths.

### 4.4 Impact Analysis List (Downstream Focus)
Provides a list view for "concrete damage scope" that is hard to grasp from the graph alone.
*   **Downstream Jobs:** List of ETL jobs taking this table as input. (Indicate SLA/Critical Path status)
*   **Leaf Tables:** List of final tables with no further downstream. (Identify Mart tables for Dashboards, etc.)
*   **Action:** `Export List to CSV` (for creating impact reports).

### 4.5 Provenance & Governance (Upstream Focus)
*   **Source Roots:** Identify and display the chaotic original sources (Source System, Raw Log, etc.).
*   **Classification Trace:**
    *   Show tracking info on where the current table's `PII` tag originated (which upstream table/column).
    *   Example: `user_id (PII) inherited from raw.users`

## 5. Data Requirements

The Backend API must support the following capabilities:
1.  **Graph Traversal API:** Fetch nodes/edges by specified Depth and Direction.
2.  **Leaf Node Detection:** Identify downstream nodes with an Out-degree of 0.
3.  **Source Root Detection:** Identify upstream nodes with an In-degree of 0.
4.  **Aggregation Logic:** (Optional) Group nodes at the backend level before returning if the count is high.

## 6. Implementation Roadmap

1.  **Phase 1 (Basic):** Summary Cards + Basic Mermaid Graph (with Interactive Expansion).
2.  **Phase 2 (Analysis):** Impact Analysis List (Implement Leaf Node detection logic).
3.  **Phase 3 (Governance):** Display Classification Propagation and enhance Path Highlight features.

## 7. Changes from v1
*   **Technical Feasibility:** Explicitly adopted "State-based Re-rendering" for Aggregation and Expansion to work around Mermaid.js limitations.
*   **Term Refinement:** Highlighted "Impact (Leaf)" as a separate section to increase operational utility.
*   **Structure Refinement:** Redefined layout in logical order (Summary -> Graph -> Detailed List).

# Lineage Manager Testing Guide

This guide provides a comprehensive overview of the testing strategy for the Lineage Manager, including how to run tests, the structure of the test suite, and detailed explanations of the integration scenarios.

## 🚀 Running Tests

We provide a convenient Make command to run all tests (Unit + Integration) in a consistent environment.

```bash
# Run all tests
make test
```

This command automatically:
1.  Activates the virtual environment.
2.  Sets `PYTHONPATH=src` to ensure correct package resolution.
3.  Runs `pytest` with verbose output.

## 🧪 Test Suite Structure

The tests are organized into two main categories:

### 1. Unit Tests (`tests/unit/`)
Focus on individual components in isolation.
*   **Key Focus**: Verifying the internal logic of services without hitting the database or external APIs.
*   **Architecture Validation**: Ensures that `GraphCommandService` **never** manages its own transactions (enforcing the "Orchestrator Pattern").

### 2. Integration Tests (`tests/integration/`)
Focus on the end-to-end behavior of the system against a real (or test) database.
*   **File**: `test_graph_scenarios.py`
*   **Key Focus**: Verifying API contracts, graph traversal logic, and data consistency.

## 🌐 12 Integration Test Scenarios

We have implemented 12 rigorous scenarios to validate the graph capabilities under various conditions:

| #  | Scenario Name | Description |
| :--- | :--- | :--- |
| **01** | **Sequential Chain** | A linear chain of 20 jobs (`J1 -> J2 -> ... -> J20`). Verifies basic upstream/downstream traversal depth. |
| **02** | **Fan Hub** | A central job with multiple inputs and outputs. Verifies hub-and-spoke connectivity (Fan-in/Fan-out). |
| **03** | **Validation (Empty Names)** | Ensures the system rejects jobs with empty IDs/names and filters out empty table names. |
| **04** | **Diamond Pattern** | Parallel paths splitting and converging (`T1 -> (P1, P2) -> T4`). Verifies path discovery. |
| **05** | **Multi-Producer** | Multiple jobs writing to the same table. Verifies data convergence. |
| **06** | **Disconnected Islands** | Two completely separate graphs. Verifies that traversal stays within the correct island. |
| **07** | **Simple Cycle (Self-loop)** | A job inputting and outputting the same table. Verifies infinite loop prevention. |
| **08** | **Multi-Job Cycle** | A cycle spanning multiple jobs (`J1 -> T2 -> J2 -> T1`). Verifies complex cycle handling. |
| **09** | **Branching** | Multiple jobs consuming from a single intermediate table. Verifies proper branching. |
| **10** | **Many-to-Many Bridge** | Complex mapping (`(T1, T2) -> J1 -> (T3, T4)`). Verifies intermediate connectivity. |
| **11** | **Ordering Independence** | **CRITICAL**: Verifies that registering jobs in any order (`1,2,3` vs `3,2,1`) produces the **exact same graph**. |
| **12** | **BFS Depth Precision** | Verifies that the `level` parameter in API calls precisely limits the traversal depth (e.g., Level 4 vs Level 6). |

## 🏗️ Key Architectural Concepts

### Transaction Management
The system enforces a strict **Orchestrator Pattern** for transactions:
*   **Command Services** (e.g., `GraphCommandService`) **NEVER** commit transactions. They only stage changes.
*   **Orchestrators** (e.g., API Endpoints, `GraphSyncService`) possess the `with uow.transactional():` block to handle commits and rollbacks.

### Forward-Looking Dependencies
To achieve **Ordering Independence** (Scenario 11), the graph builder is "Forward-Looking".
*   When a job is registered, it looks **backwards** to find its producers (Upstream).
*   It *also* looks **forwards** to find any existing jobs that already consume its output tables (Downstream).
*   This ensures links are created regardless of whether the producer or consumer was registered first.

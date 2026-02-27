# Lineage Manager V2

Lineage Manager V2 is a high-performance metadata and lineage management system built with FastAPI, SQLAlchemy (Async), and Celery.

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.12+
- MySQL (or compatible database)
- Redis (required as a Celery Broker/Backend)

### 2. Pre-execution Checklist
Before starting, ensure your environment is clean and infrastructure is ready:
- **Clean up existing processes**: If you have previously running servers or workers, terminate them:
  ```bash
  pkill -9 -f "celery|uvicorn" || true
  ```
- **Verify Infrastructure**: Ensure **MySQL** and **Redis** services are up and running.
- **Activate Virtual Environment**: Always ensure you are working inside the virtual environment after running `make venv`:
  ```bash
  source .venv/bin/activate
  ```

### 3. Environment Setup

Create a virtual environment and install the necessary dependencies:
```bash
make venv
source .venv/bin/activate
```

Please check the `.env` file to configure your database and Redis connection details.

### 4. Service Execution

To ensure the system is fully operational, you need to run the following **three** processes in separate terminals:

#### A. FastAPI Server (API Layer)
Runs on port 5004 by default.
```bash
make dev  # Alternatively: PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload --port 5004
```

#### B. Celery Worker (Background Tasks)
Handles graph initialization and other asynchronous commands.
```bash
make worker
```
*Note: The `--pool=solo` flag is used inside the Makefile to ensure compatibility with asynchronous SQLAlchemy.*

#### C. Dummy Job Manager (Mock External API)
A mock server providing lineage data for discovery testing.
```bash
# Execute from the apps/backend/dummy-job-manager directory
PYTHONPATH=. .venv/bin/python dummy_job_manager.py
```

### 5. Testing & Verification

- **Interactive API Docs**: Access via [http://localhost:5004/docs](http://localhost:5004/docs)
- **Graph Initialization**: Send a `POST /api/v2/graph/init` request to trigger the automated discovery from the external manager.
- **Audit Logs**: Review execution history and command status via `GET /api/v2/audits/`.

## 🛠 Useful Commands (Makefile)

- `make venv`: Create virtual environment and install dependencies.
- `make dev`: Start the development server.
- `make worker`: Start the Celery worker.
- `make test`: Run unit tests.
- `make lint`: Perform type checking with mypy.
- `make format`: Format code using black and isort.
- `make db-upgrade`: Apply database migrations.

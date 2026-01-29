---
status: shipped
owner: David
created: 2026-01-30
updated: 2026-01-30
version: 1.0
related: [../00.guides/local-docker-guide.md]
tags: [onboarding, setup, development]
---

Created: 2026-01-30
Updated: 2026-01-30
Author: David
Version: 1.0
Status: Shipped
Title: Development Environment Setup Guide

Summary:
Step-by-step instructions for setting up a local development environment to contribute to the Lineage Platform.

---

## 🏗️ Prerequisites

Ensure you have the following installed on your local machine:

- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (LTS recommended)
- **Docker & Docker Compose**: For running the backend stack locally
- **Make**: To use the project task runners
- **Git**: For version control

---

## 🚀 Quick Start

### 1. Repository Setup
Clone the repository and enter the project directory:

```bash
git clone <repository-url>
cd lineage_platform
```

### 2. Backend Environment Setup
We use a centralized `Makefile` at the root to manage environments.

```bash
# Create virtual environments and install dependencies for all apps
make venv-all
```

### 3. Running Services locally

#### Option A: Running with Docker (Recommended for integration)
This runs the full stack including Database and Redis.
```bash
# Run backend stack
make backend-up

# Run admin console stack
make admin-up
```

#### Option B: Running for Development (Nvidia/Fast mode)
If you are developing only the backend:
```bash
cd apps/backend
source venv/bin/activate
make run
```

---

## 🛠️ Verification Checklist

- [ ] **Backend API**: Navigate to [http://localhost:5003/lineage-manager/docs](http://localhost:5003/lineage-manager/docs) to see Swagger UI.
- [ ] **Admin Console**: Navigate to [http://localhost:5100/admin-console](http://localhost:5100/admin-console) to see the main UI.
- [ ] **Database Connectivity**: Use `docker ps` to ensure `db-mysql` is running.

---

## 🔒 Environment Variables
Copy `.env.example` to `.env` in the root and relevant app directories if needed, though default local settings are typically pre-configured for Docker Compose.

> [!TIP]
> Use `make help` to see all available automation commands for different components.

---
description: Local development environment setup
---

This workflow helps you set up the local development environment for the Lineage Platform.

1. Create Python virtual environments for all backends
// turbo
```bash
make venv-all
```

2. (Optional) Start the Docker stack for database/Redis/Apps
// turbo
```bash
make up
```

3. Verify the setup by running tests
// turbo
```bash
make test-all
```

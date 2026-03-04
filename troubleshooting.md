# Troubleshooting Guide - Deployment & 502 Errors

If you are experiencing **502 Bad Gateway** errors after deploying to a new environment, follow these steps to identify and resolve the issue.

## 1. Verify Container Status
The most common cause of 502 errors is that the upstream service (e.g., `lineage-api` or `analytics-api`) is not running.

```bash
docker ps
```
- Ensure `shell`, `lineage-api`, and `analytics-api` are all in the `Up` status.
- If a container is missing or restarting, check its logs:
  ```bash
  docker logs lineage-api
  docker logs analytics-api
  ```

## 2. Check Nginx Upstream Configuration
The `shell` container acts as a proxy. It needs to know exactly where the backend services are.

### Environment Variables
Check the environment variables injected into the `shell` container:
```bash
docker exec shell env | grep _UPSTREAM
docker exec shell env | grep BACKEND_HOST
```
- `BACKEND_HOST` should be `http://lineage-api:5003`
- `ANALYTICS_MANAGER_UPSTREAM` should be `http://analytics-api:5002`

### Nginx Resolver
If Nginx cannot resolve the service names (e.g., `lineage-api`), it will return a 502.
Test connectivity from the `shell` container:
```bash
docker exec shell ping -c 2 lineage-api
docker exec shell ping -c 2 analytics-api
```

## 3. Verify API Routing Logic
The frontend now expects all API calls to include a service-specific prefix.

### Search API Flow Example
1.  **Frontend Component**: `GlobalSearch.tsx` calls `fetch('/admin-console/lineage-manager/api/v1/search?q=...')`.
2.  **Nginx (Shell)**: Matches `location ^~ /admin-console/lineage-manager/`.
3.  **URL Rewrite**: Strips `/admin-console`. URI becomes `/lineage-manager/api/v1/search`.
4.  **Forwarding**: Proxies to `http://lineage-api:5003/lineage-manager/api/v1/search`.
5.  **Backend (FastAPI)**: Handled by the search router mounted at `/lineage-manager/api/v1/search`.

### Common Failure Points:
- **404 in Browser**: Nginx prefix match failed or frontend path is wrong.
- **502 in Browser**: Nginx cannot reach `lineage-api` (container is down or port is blocked).
- **Backend 404**: Request reached `lineage-api` but the sub-path `/lineage-manager/api/v1/search` is not registered in FastAPI.

## 4. GCP Authentication (BigQuery)
If `analytics-api` is running but failing to fetch data (check logs), it might be a permission issue.

### Application Default Credentials (ADC)
The system is configured to use the host's gcloud credentials:
```bash
# Host check
ls ~/.config/gcloud/application_default_credentials.json

# Container check
docker exec analytics-api ls /root/.config/gcloud/application_default_credentials.json
```
- If the file is missing in the container, the volume mount in `docker-compose.yml` failed.
- Ensure you have run `gcloud auth application-default login` on the host machine.

## 5. Common Solutions
- **Rebuild with latest config**:
  ```bash
  make backend-rebuild
  make frontend-rebuild
  ```
- **Force recreation**:
  ```bash
  docker compose up -d --force-recreate shell lineage-api analytics-api
  ```
- **Check for port conflicts**: Ensure ports 5100, 5002, and 5003 are not being used by other processes on the host.

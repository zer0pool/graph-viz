# Frontend Nginx Routing Configuration

## Overview
The frontend nginx acts as a reverse proxy, routing requests to different backend microservices based on URL patterns.

## Routing Rules

### 1. Lineage Manager Backend (Port 5003)
**Pattern:** `/lineage-manager/*`

**Examples:**
```
External Request:
http://localhost:5100/admin-console/lineage-manager/api/v1/health

Nginx Processing:
1. Matches: ^(/admin-console)?/lineage-manager/
2. Rewrites: /admin-console/lineage-manager/api/v1/health → /lineage-manager/api/v1/health
3. Proxies to: http://localhost:5003/lineage-manager/api/v1/health
```

**Endpoints:**
- `/lineage-manager/api/v1/health` - Health check
- `/lineage-manager/api/v1/graph/diagnose` - Graph diagnostics
- `/lineage-manager/api/v1/jobs` - Job management
- `/lineage-manager/api/v1/projects` - Project management
- `/lineage-manager/api/v1/lineage/*` - Lineage queries

### 2. Analytics Manager Backend (Port 5002)
**Pattern:** `/analytics-manager/*`

**Examples:**
```
External Request:
http://localhost:5100/admin-console/analytics-manager/api/v1/analytics/top-visited

Nginx Processing:
1. Matches: ^(/admin-console)?/analytics-manager/
2. Rewrites: /admin-console/analytics-manager/api/v1/analytics/top-visited → /analytics-manager/api/v1/analytics/top-visited
3. Proxies to: http://localhost:5002/analytics-manager/api/v1/analytics/top-visited
```

**Endpoints:**
- `/analytics-manager/api/v1/analytics/top-visited` - Top visited resources
- `/analytics-manager/api/v1/analytics/user-activity` - User activity metrics
- `/analytics-manager/api/v1/health` - Health check

### 3. Legacy API Fallback
**Pattern:** `/api/*` (without service prefix)

**Purpose:** Backward compatibility for old API calls

**Example:**
```
External Request:
http://localhost:5100/admin-console/api/v1/some-endpoint

Nginx Processing:
1. Matches: ^(/admin-console)?/api
2. Rewrites: /admin-console/api/v1/some-endpoint → /api/v1/some-endpoint
3. Proxies to: $BACKEND_HOST/api/v1/some-endpoint
```

## URL Structure

### Production (with Gateway)
```
https://example.com/admin-console/{service-name}/api/v1/{resource}
                     └─────┬─────┘ └─────┬──────┘ └──┬──┘ └───┬───┘
                      Frontend      Service         API     Resource
                       Prefix       Identifier    Version    Path
```

### Local Development
```
http://localhost:5100/admin-console/{service-name}/api/v1/{resource}
http://localhost:5003/{service-name}/api/v1/{resource}  (Direct to backend)
```

## Service Port Mapping

| Service | Port | Base Path |
|---------|------|-----------|
| Frontend (Nginx) | 5100 | `/admin-console` |
| Lineage Manager | 5003 | `/lineage-manager` |
| Analytics Manager | 5002 | `/analytics-manager` |

## Request Flow Example

### Lineage Manager Request
```
1. Browser → http://localhost:5100/admin-console/lineage-manager/api/v1/jobs

2. Nginx (Port 5100)
   - Matches: location ~ ^(/admin-console)?/lineage-manager/
   - Strips: /admin-console
   - Keeps: /lineage-manager/api/v1/jobs
   
3. Backend (Port 5003)
   - Receives: /lineage-manager/api/v1/jobs
   - FastAPI routes with prefix: /lineage-manager/api/v1
   - Handles: /jobs endpoint
   
4. Response ← Returns job data
```

### Analytics Manager Request
```
1. Browser → http://localhost:5100/admin-console/analytics-manager/api/v1/analytics/top-visited

2. Nginx (Port 5100)
   - Matches: location ~ ^(/admin-console)?/analytics-manager/
   - Strips: /admin-console
   - Keeps: /analytics-manager/api/v1/analytics/top-visited
   
3. Backend (Port 5002)
   - Receives: /analytics-manager/api/v1/analytics/top-visited
   - FastAPI routes with prefix: /analytics-manager/api/v1
   - Handles: /analytics/top-visited endpoint
   
4. Response ← Returns analytics data
```

## Debugging

### Check Nginx Logs
```bash
# Lineage Manager requests
tail -f /var/log/nginx/lineage_manager_access.log
tail -f /var/log/nginx/lineage_manager_error.log

# Analytics Manager requests
tail -f /var/log/nginx/analytics_manager_access.log
tail -f /var/log/nginx/analytics_manager_error.log

# Legacy API requests
tail -f /var/log/nginx/api_access.log
tail -f /var/log/nginx/api_error.log
```

### Test Routing
```bash
# Test Lineage Manager
curl http://localhost:5100/admin-console/lineage-manager/api/v1/health

# Test Analytics Manager
curl http://localhost:5100/admin-console/analytics-manager/api/v1/health

# Direct backend access (bypass nginx)
curl http://localhost:5003/lineage-manager/api/v1/health
curl http://localhost:5002/analytics-manager/api/v1/health
```

## Configuration Files

- **Nginx Template:** `container/deploy/docker/nginx.conf.template`
- **Lineage Manager Config:** `apps/backend/lineage_manager_v2/app/core/config.py`
- **Analytics Manager Config:** `apps/backend/analytics_manager/app/core/config.py`

## Notes

1. **Service Prefix is Mandatory:** All backend services MUST include their service name in the API prefix (e.g., `/lineage-manager/api/v1`)
2. **Nginx Strips Frontend Prefix Only:** The `/admin-console` prefix is removed, but service identifiers are preserved
3. **Location Block Order Matters:** Service-specific routes (7.1, 7.2) are checked before the legacy fallback (7.3)
4. **Regex Matching:** The `~` operator enables regex matching for flexible prefix handling

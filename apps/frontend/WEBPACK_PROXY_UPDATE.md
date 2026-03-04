# Webpack Proxy Configuration Update Summary

## Overview
Updated webpack dev server proxy configurations across all frontend applications to support microservice routing with service-specific prefixes.

## Updated Files

### 1. Container (Shell) - Port 5100
**File:** `/apps/frontend/container/webpack.config.js`

**Proxy Rules:**
```javascript
proxy: [
  // Lineage Manager Backend (Port 5003)
  {
    context: ["/admin-console/lineage-manager"],
    target: "http://localhost:5003",
    pathRewrite: { "^/admin-console": "" },
  },
  // Analytics Manager Backend (Port 5002)
  {
    context: ["/admin-console/analytics-manager"],
    target: "http://localhost:5002",
    pathRewrite: { "^/admin-console": "" },
  },
  // Legacy API fallback
  {
    context: ["/admin-console/api"],
    target: "http://localhost:5003",
    pathRewrite: { "^/admin-console/api": "/lineage-manager/api" },
  },
  // MFE Lineage & Catalog proxies...
]
```

### 2. MFE-Lineage - Port 5101
**File:** `/apps/frontend/mfe-lineage/webpack.config.js`

**Proxy Rules:**
```javascript
proxy: [
  // Lineage Manager Backend (Port 5003)
  {
    context: ["/lineage-manager"],
    target: "http://127.0.0.1:5003",
  },
  // Analytics Manager Backend (Port 5002)
  {
    context: ["/analytics-manager"],
    target: "http://127.0.0.1:5002",
  },
  // Legacy API fallback
  {
    context: ["/api"],
    target: "http://127.0.0.1:5003",
    pathRewrite: { "^/api": "/lineage-manager/api" },
  },
]
```

### 3. MFE-Catalog - Port 5102
**File:** `/apps/frontend/mfe-catalog/webpack.config.js`

**Proxy Rules:**
```javascript
proxy: [
  // Lineage Manager Backend (Port 5003)
  {
    context: ["/admin-console/lineage-manager", "/lineage-manager"],
    target: "http://127.0.0.1:5003",
    pathRewrite: { "^/admin-console": "" },
  },
  // Analytics Manager Backend (Port 5004)
  {
    context: ["/admin-console/analytics-manager", "/analytics-manager"],
    target: "http://127.0.0.1:5004",
    pathRewrite: { "^/admin-console": "" },
  },
  // Legacy API fallback
  {
    context: ["/admin-console/api", "/api"],
    target: "http://127.0.0.1:5003",
    pathRewrite: { 
      "^/admin-console/api": "/lineage-manager/api",
      "^/api": "/lineage-manager/api"
    },
  },
]
```

## Routing Examples

### From Container (Shell)
```
Request: http://localhost:5100/admin-console/lineage-manager/api/v1/health
Proxy:   http://localhost:5003/lineage-manager/api/v1/health
```

### From MFE-Lineage (Standalone)
```
Request: http://localhost:5101/lineage-manager/api/v1/health
Proxy:   http://localhost:5003/lineage-manager/api/v1/health
```

### From MFE-Catalog (Standalone)
```
Request: http://localhost:5102/lineage-manager/api/v1/health
Proxy:   http://localhost:5003/lineage-manager/api/v1/health
```

### From MFE-Catalog (Embedded in Shell)
```
Request: http://localhost:5102/admin-console/lineage-manager/api/v1/health
Proxy:   http://localhost:5003/lineage-manager/api/v1/health
```

## Key Features

1. **Service-Specific Routing**: Each backend service has its own proxy rule
2. **Dual Context Support**: MFE-Catalog supports both standalone and embedded modes
3. **Legacy Compatibility**: Old `/api` paths still work via fallback rules
4. **Debug Logging**: Enabled for troubleshooting during development

## Testing After Restart

After restarting webpack dev servers, test with:

```bash
# Container (Shell)
curl http://localhost:5100/admin-console/lineage-manager/api/v1/health

# MFE-Lineage
curl http://localhost:5101/lineage-manager/api/v1/health

# MFE-Catalog
curl http://localhost:5102/lineage-manager/api/v1/health
```

## Restart Commands

```bash
# Stop all webpack dev servers
pkill -f "webpack"

# Restart Container
cd apps/frontend/container
npm run dev

# Restart MFE-Lineage
cd apps/frontend/mfe-lineage
npm run dev

# Restart MFE-Catalog
cd apps/frontend/mfe-catalog
npm run dev
```

## Production Deployment

For production, ensure the nginx configuration in `/apps/frontend/container/deploy/docker/nginx.conf.template` is also updated (already done).

## Notes

- All webpack dev servers now support the new microservice routing pattern
- The `/admin-console` prefix is stripped before forwarding to backends
- Service identifiers (`/lineage-manager`, `/analytics-manager`) are preserved
- This ensures consistency between development and production environments

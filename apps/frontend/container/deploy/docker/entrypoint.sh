#!/bin/sh
set -e

echo "[Shell] Starting Entrypoint Script (v5)..."

# 1. Sanitize BASE_URL
export BASE_URL=$(echo "${BASE_URL:-/}" | sed 's#^/*#/#; s#/*$##')

if [ "$BASE_URL" = "/" ]; then
    export BASE_URL_PREFIX="" 
    export REDIRECT_COMMAND=""
    # For root, we just need to proxy /api
    export API_LOCATION_REGEX="${API_LOCATION_REGEX:-^/api}"
    export SUBPATH_REDIRECT_BLOCK="# No subpath redirect needed"
else
    export BASE_URL_PREFIX="$BASE_URL"
    export REDIRECT_COMMAND="return 301 ${BASE_URL}/;"
    export API_LOCATION_REGEX="${API_LOCATION_REGEX:-^($BASE_URL)?/api}"
    export SUBPATH_REDIRECT_BLOCK="location = $BASE_URL { if (\$loggable = 0) { access_log off; return 200 'healthy'; } return 301 ${BASE_URL}/; }"
fi

# Extract nameserver for Nginx resolver if not provided
if [ -z "$NAMESERVER" ]; then
    export NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -n1 | cut -d ' ' -f2)
    if [ -z "$NAMESERVER" ]; then
        export NAMESERVER="127.0.0.11" # Docker default
    fi
fi

# Set default upstream hosts
if [ -n "$K8S_NAMESPACE" ]; then
    echo "[Shell] K8S_NAMESPACE detected: ${K8S_NAMESPACE}. Using FQDNs for upstreams."
    export BACKEND_HOST="${BACKEND_HOST:-http://lineage-manager.${K8S_NAMESPACE}.svc.cluster.local:5003}"
    export MFE_LINEAGE_UPSTREAM="${MFE_LINEAGE_UPSTREAM:-http://admin-mfe-lineage.${K8S_NAMESPACE}.svc.cluster.local:5101}"
    export MFE_CATALOG_UPSTREAM="${MFE_CATALOG_UPSTREAM:-http://admin-mfe-catalog.${K8S_NAMESPACE}.svc.cluster.local:5102}"
else
    export BACKEND_HOST="${BACKEND_HOST:-http://lineage-manager:5003}"
    export MFE_LINEAGE_UPSTREAM="${MFE_LINEAGE_UPSTREAM:-http://frontend-mfe-lineage:80}"
    export MFE_CATALOG_UPSTREAM="${MFE_CATALOG_UPSTREAM:-http://frontend-mfe-catalog:80}"
fi

# Set specific service upstreams (Defaults to Host-Development friendly host.docker.internal)
# This allows using 'make dev' on host while frontend is in docker.
export LINEAGE_MANAGER_UPSTREAM="${LINEAGE_MANAGER_UPSTREAM:-$BACKEND_HOST}"
export ANALYTICS_MANAGER_UPSTREAM="${ANALYTICS_MANAGER_UPSTREAM:-http://analytics-manager-api:5004}"

echo "[Shell] Config Summary:"
echo " - BASE_URL: ${BASE_URL}"
echo " - BASE_URL_PREFIX: ${BASE_URL_PREFIX:-'/' (root)}"
echo " - API_REGEX: ${API_LOCATION_REGEX}"
echo " - NAMESERVER: ${NAMESERVER}"
echo " - BACKEND_HOST: ${BACKEND_HOST}"
echo " - LINEAGE_MANAGER_UPSTREAM: ${LINEAGE_MANAGER_UPSTREAM}"
echo " - ANALYTICS_MANAGER_UPSTREAM: ${ANALYTICS_MANAGER_UPSTREAM}"
echo " - MFE_LINEAGE_UPSTREAM: ${MFE_LINEAGE_UPSTREAM}"
echo " - MFE_CATALOG_UPSTREAM: ${MFE_CATALOG_UPSTREAM}"

# 2. Environment Variable Injection
echo "[Shell] Injecting runtime configuration..."

# Load variable lists from manifest
if [ -f /vars.sh ]; then
    . /vars.sh
else
    # Fallback if file missing (local testing outside docker)
    export ALL_VARS='$API_BASE_URL $BASE_URL $BASE_URL_PREFIX $REDIRECT_COMMAND $API_LOCATION_REGEX $SUBPATH_REDIRECT_BLOCK $ENABLE_LINEAGE_MFE $ENABLE_CATALOG_MFE $LINEAGE_MFE_URL $CATALOG_MFE_URL $NAMESERVER $BACKEND_HOST'
fi

# Inject into config.js
envsubst "$ALL_VARS" < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js

# Inject into index.html (for base href)
envsubst "$ALL_VARS" < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html

# Prevent Nginx official script from overriding our config
# We read from /etc/nginx/nginx.conf.template instead of the templates/ folder
# to avoid automatic (and potentially failing) processing by Nginx's entrypoint.
envsubst "$ALL_VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# 3. Hand over to official Nginx entrypoint
echo "[Shell] Launching Nginx..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

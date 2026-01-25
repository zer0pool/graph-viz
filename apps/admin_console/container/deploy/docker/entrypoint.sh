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
    export REDIRECT_COMMAND="return 301 $BASE_URL/;"
    # For subpath, we proxy both /api and /subpath/api
    export API_LOCATION_REGEX="${API_LOCATION_REGEX:-^($BASE_URL)?/api}"
    export SUBPATH_REDIRECT_BLOCK="location = $BASE_URL { return 301 $BASE_URL/; }"
fi

# Extract nameserver for Nginx resolver if not provided
if [ -z "$NAMESERVER" ]; then
    export NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -n1 | cut -d ' ' -f2)
    if [ -z "$NAMESERVER" ]; then
        export NAMESERVER="127.0.0.11" # Docker default
    fi
fi

# Set default BACKEND_HOST if not provided
export BACKEND_HOST="${BACKEND_HOST:-http://lineage-manager:5003}"

# Set default MFE upstream hosts (for local Docker, use service names; for K8s, set via env)
export MFE_LINEAGE_UPSTREAM="${MFE_LINEAGE_UPSTREAM:-http://admin-mfe-lineage:5101}"
export MFE_CATALOG_UPSTREAM="${MFE_CATALOG_UPSTREAM:-http://admin-mfe-catalog:5102}"

echo "[Shell] Config Summary:"
echo " - BASE_URL: ${BASE_URL}"
echo " - BASE_URL_PREFIX: ${BASE_URL_PREFIX:-'/' (root)}"
echo " - API_REGEX: ${API_LOCATION_REGEX}"
echo " - NAMESERVER: ${NAMESERVER}"
echo " - BACKEND_HOST: ${BACKEND_HOST}"
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

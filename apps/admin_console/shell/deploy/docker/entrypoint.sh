#!/bin/sh
set -e

echo "[Shell] Starting Entrypoint Script..."

# 1. Sanitize BASE_URL
# Ensure it starts with / and does not end with /
# e.g. "lineage-manager" -> "/lineage-manager"
# e.g. "/admin/" -> "/admin"
# e.g. "" -> "/"
export BASE_URL=$(echo "${BASE_URL:-/}" | sed 's#^/*#/#; s#/*$##')
if [ "$BASE_URL" = "" ]; then
    export BASE_URL="/"
fi

# Extract nameserver for Nginx resolver (Required for dynamic proxy_pass in K8S)
export NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -n1 | cut -d ' ' -f2)
echo "[Shell] Detected Nameserver: $NAMESERVER"

echo "[Shell] Sanitized BASE_URL: $BASE_URL"

# 2. Environment Variable Injection
echo "[Shell] Injecting runtime configuration..."

# Explicitly list variables for envsubst to avoid breaking Nginx internal vars ($uri, $host, etc.)
export ENVSUB_VARS='${API_BASE_URL} ${BASE_URL} ${ENABLE_LINEAGE_MFE} ${ENABLE_TABLE_DETAIL_MFE} ${LINEAGE_MFE_URL} ${TABLE_DETAIL_MFE_URL} ${NAMESERVER}'

# Inject into config.js
envsubst "$ENVSUB_VARS" \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js

# Set filter for the official Nginx docker-entrypoint.sh
# This ensures that /etc/nginx/templates/*.template are processed correctly
export NGINX_ENVSUBST_FILTER="$ENVSUB_VARS"

echo "[Shell] Verified environment variables:"
echo " - BASE_URL: $BASE_URL"
echo " - API_BASE_URL: $API_BASE_URL"
echo " - NAMESERVER: $NAMESERVER"

# 3. Hand over to official Nginx entrypoint
echo "[Shell] Launching Nginx via official entrypoint..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

#!/bin/sh
set -e

echo "[Shell] Starting Entrypoint Script..."

# 1. Sanitize BASE_URL
# Ensure it starts with / and does not end with /
# e.g. "lineage-manager" -> "/lineage-manager"
# e.g. "/admin/" -> "/admin"
# e.g. "" -> "/"
export BASE_URL=$(echo "${BASE_URL:-/}" | sed 's#^/*#/#; s#/*$##')
# If it's just "/", keep it as empty or / depending on Nginx usage. 
# Here we want "/" for root or something like "/admin"
if [ "$BASE_URL" = "" ]; then
    export BASE_URL="/"
fi

echo "[Shell] Sanitized BASE_URL: $BASE_URL"

# 2. Environment Variable Injection
echo "[Shell] Injecting runtime configuration..."
# Use envsubst to replace placeholders in config.template.js
envsubst '${API_BASE_URL} ${BASE_URL} ${ENABLE_LINEAGE_MFE} ${ENABLE_TABLE_DETAIL_MFE} ${LINEAGE_MFE_URL} ${TABLE_DETAIL_MFE_URL}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js

echo "[Shell] Verified environment variables:"
echo " - BASE_URL: $BASE_URL"
echo " - API_BASE_URL: $API_BASE_URL"

# 3. Hand over to official Nginx entrypoint
echo "[Shell] Launching Nginx via official entrypoint..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

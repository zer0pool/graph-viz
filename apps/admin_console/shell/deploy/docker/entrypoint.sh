#!/bin/sh
set -e

echo "[Shell] Starting Entrypoint Script..."

# 1. Environment Variable Injection
echo "[Shell] Injecting runtime configuration..."
# Use envsubst to replace placeholders in config.template.js
envsubst '${API_BASE_URL} ${BASE_URL} ${ENABLE_LINEAGE_MFE} ${ENABLE_TABLE_DETAIL_MFE}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js

echo "[Shell] Verified environment variables:"
echo " - BASE_URL: $BASE_URL"
echo " - API_BASE_URL: $API_BASE_URL"

# 2. Hand over to official Nginx entrypoint
echo "[Shell] Launching Nginx via official entrypoint..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

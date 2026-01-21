#!/bin/sh
set -e

echo "[MFE] Starting Entrypoint Script..."

# 1. Sanitize BASE_URL
export BASE_URL=$(echo "${BASE_URL:-/}" | sed 's#^/*#/#; s#/*$##')

# Extract nameserver for Nginx resolver
export NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -n1 | cut -d ' ' -f2)
if [ -z "$NAMESERVER" ]; then
    export NAMESERVER="127.0.0.11" # Docker default
fi

echo "[MFE] Config Summary:"
echo " - BASE_URL: ${BASE_URL}"
echo " - NAMESERVER: ${NAMESERVER}"

# 2. Environment Variable Injection
echo "[MFE] Injecting runtime configuration..."
export ALL_VARS='$API_BASE_URL $BASE_URL $NAMESERVER'

# Inject into config.js
envsubst "$ALL_VARS" < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js

# Inject into index.html (for base href)
envsubst "$ALL_VARS" < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html

# Inject into Nginx config
envsubst "$ALL_VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# 4. Hand over to official Nginx entrypoint
echo "[MFE] Launching Nginx..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

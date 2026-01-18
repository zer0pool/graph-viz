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
if [ -f /usr/share/nginx/html/config.template.js ]; then
    envsubst "$ALL_VARS" < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js
fi

# Inject into index.html (for base href)
if [ -f /usr/share/nginx/html/index.html.template ]; then
    envsubst "$ALL_VARS" < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html
fi

# Inject into Nginx config
if [ -f /etc/nginx/templates/default.conf.template ]; then
    envsubst "$ALL_VARS" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# 4. Hand over to official Nginx entrypoint
echo "[MFE] Launching Nginx..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

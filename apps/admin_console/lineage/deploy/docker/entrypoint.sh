#!/bin/sh
set -e

echo "[MFE] Starting Entrypoint Script..."

# 1. Sanitize BASE_URL
export BASE_URL=$(echo "${BASE_URL:-/}" | sed 's#^/*#/#; s#/*$##')

echo "[MFE] Config Summary:"
echo " - BASE_URL: ${BASE_URL}"

# 2. Inject into index.html (for base href)
if [ -f /usr/share/nginx/html/index.html.template ]; then
    echo "[MFE] Injecting BASE_URL into index.html..."
    envsubst '$BASE_URL' < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html
fi

# 3. Inject into Nginx config
if [ -f /etc/nginx/templates/default.conf.template ]; then
    echo "[MFE] Injecting configuration into Nginx..."
    envsubst '$BASE_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# 4. Hand over to official Nginx entrypoint
echo "[MFE] Launching Nginx..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

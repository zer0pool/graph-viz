#!/bin/sh
set -e

echo "[MFE] Starting Entrypoint Script..."

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
    export REDIRECT_COMMAND="if (\$http_user_agent ~* \"(GoogleHC|kube-probe)\") { access_log off; return 200 \"healthy\"; } return 301 \$BASE_URL/;"
    export API_LOCATION_REGEX="\${API_LOCATION_REGEX:-^(\$BASE_URL)?/api}"
    export SUBPATH_REDIRECT_BLOCK=\"location = \$BASE_URL { if (\$http_user_agent ~* \\\"(GoogleHC|kube-probe)\\\") { access_log off; return 200 \\\"healthy\\\"; } return 301 \$BASE_URL/; }\"
fi

# Extract nameserver for Nginx resolver if not provided
if [ -z "$NAMESERVER" ]; then
    export NAMESERVER=$(grep -i '^nameserver' /etc/resolv.conf | head -n1 | cut -d ' ' -f2)
    if [ -z "$NAMESERVER" ]; then
        export NAMESERVER="127.0.0.11" # Docker default
    fi
fi

# Set default BACKEND_HOST
if [ -n "$K8S_NAMESPACE" ]; then
    echo "[MFE] K8S_NAMESPACE detected: ${K8S_NAMESPACE}. Using FQDN for BACKEND_HOST."
    export BACKEND_HOST="${BACKEND_HOST:-http://lineage-manager.${K8S_NAMESPACE}.svc.cluster.local:5003}"
else
    export BACKEND_HOST="${BACKEND_HOST:-http://lineage-manager:5003}"
fi

echo "[MFE] Config Summary:"
echo " - BASE_URL: ${BASE_URL}"
echo " - BASE_URL_PREFIX: ${BASE_URL_PREFIX:-'/' (root)}"
echo " - API_REGEX: ${API_LOCATION_REGEX}"
echo " - NAMESERVER: ${NAMESERVER}"
echo " - BACKEND_HOST: ${BACKEND_HOST}"

# 2. Environment Variable Injection
echo "[MFE] Injecting runtime configuration..."
export ALL_VARS='$API_BASE_URL $BASE_URL $BASE_URL_PREFIX $REDIRECT_COMMAND $API_LOCATION_REGEX $SUBPATH_REDIRECT_BLOCK $NAMESERVER $BACKEND_HOST $CATALOG_MFE_URL'

# Inject into config.js
envsubst "$ALL_VARS" < /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js

# Inject into index.html (for base href)
envsubst "$ALL_VARS" < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html

# Inject into Nginx config
envsubst "$ALL_VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# 4. Hand over to official Nginx entrypoint
echo "[MFE] Launching Nginx..."
exec /docker-entrypoint.sh nginx -g "daemon off;"

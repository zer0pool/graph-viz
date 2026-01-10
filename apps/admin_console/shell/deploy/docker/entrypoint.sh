#!/bin/sh
# entrypoint.sh - Shell MFE Runtime Configuration

echo "[Shell] Starting Entrypoint Script..."

# 1. Environment Variable Injection (Optional but recommended for In-Net)
# If we need to replace placeholders in built JS files with runtime env vars:
# Example: find /usr/share/nginx/html -name "*.js" | xargs sed -i "s|__VITE_API_BASE_URL__|${API_BASE_URL}|g"

echo "[Shell] Verified environment variables:"
echo " - NODE_ENV: $NODE_ENV"
echo " - PORT: ${PORT:-80}"

# 2. Start Nginx
echo "[Shell] Launching Nginx..."
exec nginx -g "daemon off;"

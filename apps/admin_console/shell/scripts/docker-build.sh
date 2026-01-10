#!/bin/bash
# docker-build.sh - Local build script for Shell MFE

# Configuration
IMAGE_NAME="admin-console-shell"
TAG="latest"

echo "[Shell] Starting local Docker build..."

# Move to the root of the shell app if needed, 
# but assuming this script is run from apps/admin_console/shell/scripts
cd "$(dirname "$0")/.."

# Build the image from app root context
docker build -t ${IMAGE_NAME}:${TAG} -f deploy/docker/Dockerfile .

echo ""
echo "[Shell] Build complete: ${IMAGE_NAME}:${TAG}"
echo "[Shell] To run locally: docker run -p 8080:80 ${IMAGE_NAME}:${TAG}"

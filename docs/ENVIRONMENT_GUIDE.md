# Environment Configuration Guide

This document outlines how to manage environment variables for the Admin Console Shell across different stages of development and deployment.

## 1. Local Development (`npm run dev`)

- **Mechanism**: Use default values in `src/config.ts` and Webpack Dev Server proxy.
- **Config**:
  - `src/config.ts`: Sensible defaults for `localhost`.
  - `webpack.config.js`: `devServer.proxy` to route `/api` to the backend.
- **Benefit**: Quick iteration without building Docker images.

## 2. Local Integration Test (`docker compose`)

- **Mechanism**: `entrypoint.sh` inside the container injection.
- **Config**: Defined in `docker-compose.yml`.
  ```yaml
  environment:
    - BASE_URL=/lineage-manager
    - API_BASE_URL=http://lineage-manager:5003
  ```
- **Action**: Use `docker compose up --build` after any environment variable changes.

## 3. Kubernetes Development (`helm`)

- **Mechanism**: Helm values mapped to Deployment environment variables.
- **Config**: `values-dev.yaml`.
  ```yaml
  env:
    BASE_URL: "/lineage-manager"
    API_BASE_URL: "http://lineage-manager-backend-svc:5003"
  ```
- **Verification**: Check `kubectl logs <pod>` to see `entrypoint.sh` output.

## 4. Kubernetes Production (`helm`)

- **Mechanism**: Same as Dev, but with production values and OIDC Config.
- **Config**: `values-prod.yaml`.
  ```yaml
  env:
    BASE_URL: "/admin"
    API_BASE_URL: "https://api.corporate-domain.com"
  ```

## Summary of Key Variables (`vars.sh`)

Always ensure any new variables are added to `deploy/docker/vars.sh` so they are picked up by `envsubst` during deployment.

- `BASE_URL`: The subpath the app is served from.
- `API_BASE_URL`: The address of the backend.
- `NAMESERVER`: Internal DNS for Nginx (automatically detected in K8S).

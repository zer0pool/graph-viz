# Admin Console Helm Chart

This Helm chart deploys the Admin Console application consisting of:

- **app**: Main shell application
- **mfe-lineage**: Lineage graph micro-frontend
- **mfe-catalog**: Catalog/detail viewer micro-frontend

## Installation

```bash
# Install with default values
helm install admin-console ./deploy/helm/admin-console

# Install with custom values
helm install admin-console ./deploy/helm/admin-console \
  --set image.tag=v1.0.0 \
  --set ingress.hosts[0].host=admin.yourdomain.com

# Install in specific namespace
helm install admin-console ./deploy/helm/admin-console -n admin-console --create-namespace
```

## Configuration

Key configuration options in `values.yaml`:

| Parameter         | Description                 | Default                                       |
| ----------------- | --------------------------- | --------------------------------------------- |
| `image.registry`  | Docker registry             | `docker.io`                                   |
| `image.tag`       | Image tag                   | `latest`                                      |
| `app.port`        | App shell port              | `5100`                                        |
| `mfeLineage.port` | Lineage MFE port            | `5101`                                        |
| `mfeCatalog.port` | Catalog MFE port            | `5102`                                        |
| `backend.url`     | Backend API URL             | `http://lineage-manager:5003/lineage-manager` |
| `ingress.enabled` | Enable ingress              | `true`                                        |
| `ingress.hosts`   | Ingress hosts configuration | See values.yaml                               |

## Upgrading

```bash
helm upgrade admin-console ./deploy/helm/admin-console
```

## Uninstalling

```bash
helm uninstall admin-console
```

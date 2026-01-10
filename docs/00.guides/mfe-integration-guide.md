# Admin Console: Micro-Frontend (MFE) Integration Guide

This guide provides technical specifications and best practices for developing and integrating Micro-Frontends (MFEs) into the Lineage Platform Admin Console.

## 1. Architectural Overview

The application follows a **Host-Remote** architecture using **Webpack 5 Module Federation**:

- **Shell (Host)**: The container application (port 3000). It handles routing, authentication, global layout, and global state management (e.g., node selection).
- **Lineage (Remote)**: Handles graph rendering and complex lineage interactions (port 3001).
- **Detail Viewer (Remote)**: Displays detailed information for jobs and tables (port 3002).

## 2. Communication Protocol: The Event Bridge

MFEs communicate via a **pub/sub pattern** using standard browser `CustomEvent`. This decouples the remotes from the host's framework or state management library.

### Core Event: `mfe:selection`

This event is the primary way to signal that a user has interacted with a node.

#### Data Structure (`Selection`)

```typescript
interface Selection {
  type: "job" | "table"; // Category of the entity
  id: string; // Unique identifier (URN)
  tableName?: string; // Friendly name (for tables)
  jobId?: string; // Friendly name/ID (for jobs)
  action?: "click" | "showDetail"; // User Intent
}
```

#### The `action` Flag Logic

- **`click`**: The user simply selected a node. The Shell should update its global selection state (for breadcrumbs, etc.) but **not** trigger any intrusive UI like opening a drawer.
- **`showDetail`**: The user explicitly requested details (e.g., clicked a "Show Detail" icon). The Shell should open the detail drawer.

> [!TIP]
> Always provide a fallback for `tableName` and `jobId` in your consumers. In our system, if these are missing, the `id` field (which contains the URN) should be parsed.

## 3. Mounting Remotes

Remotes must expose a `mount` function to allow the Shell to initialize them with the correct context.

### Required Signature

```typescript
export function mount(
  el: HTMLElement, // DOM element to mount into
  options: {
    initialSelection?: Selection | null; // Pre-selected state
    auth?: AuthClient; // Auth methods for API calls
    eventTarget?: EventTarget; // Channel for sending/receiving events
  }
): UnmountFunction;
```

### The Async Boundary (`main.tsx`)

Webpack 5 sharing requires an async boundary to ensure shared modules (React, etc.) are loaded before execution.

1. `index.ts`: Synchronously exports the library (`mount`).
2. `main.tsx`: Asynchronously imports and boots the app for standalone mode.
3. `bootstrap.ts`: Contains the actual standalone mounting logic.

## 4. Development & Deployment Standards

### Webpack Output Configuration

To prevent "ChunkLoadError" (404) when the Shell loads a remote, the remote must know its absolute origin:

```javascript
// webpack.config.js
module.exports = {
  output: {
    // DEVELOPMENT: Use absolute URL
    publicPath: "http://localhost:3002/",
    // PRODUCTION: Use "auto" or the actual CDN/Base URL
  },
  experiments: {
    importMeta: true, // Crucial for relative path resolution in modules
  },
};
```

### Port Assignments

| Service          | Development Port |
| ---------------- | ---------------- |
| Shell            | 3000             |
| Lineage MFE      | 3001             |
| Table Detail MFE | 3002             |
| Backend API      | 5003             |

## 5. Troubleshooting Common Issues

### 404 on `src_index_ts.js`

- **Cause**: `publicPath` is set to `/` or is incorrectly inferred as the Shell's port.
- **Fix**: Ensure `publicPath` is set to the absolute URL of the remote in development.

### "Does not export a mount function"

- **Cause**: The entry point is performing an `import()` but not re-exporting the contents synchronously.
- **Fix**: Ensure `index.ts` uses `export { mount } from "./mount"`.

### Drawer Content Mismatch

- **Cause**: Different versions of the `Selection` interface in different MFEs.
- **Fix**: Refer to this guide and update the local `types.ts` in your MFE to allow the `action` and `id` fields.

---

_Last Updated: 2026-01-10_

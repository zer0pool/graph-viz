# Micro-Frontend (MFE) Integration Contract

This document defines the interface standards and communication patterns for MFE integration within the Frontend. All participating MFEs must adhere to this contract to ensure seamless interoperability.

## 1. Interaction Pattern (Event Bridge)

Communication between the Shell and remotes follows an event-driven pattern using standard `CustomEvent`.

### Event: `mfe:selection`

Used to propagate node selection data across the application.

- **Source**: `lineage` MFE or `shell` (Search)
- **Target**: `table-detail-viewer` MFE, `shell`, and other observers
- **Payload Structure (`Selection`)**:

```typescript
interface Selection {
  type: "job" | "table";
  id: string; // Full ID/URN (e.g., "table:project.dataset.name")
  tableName?: string; // Optional: Friendly name for tables
  jobId?: string; // Optional: Full ID for jobs
  action?: "click" | "showDetail"; // Intent of the selection
}
```

> [!IMPORTANT] > **Action Logic**:
>
> - `click`: Update internal state/highlights only. Do NOT open drawers or disruptive UI.
> - `showDetail`: Explicit request to open the detail panel/drawer.

## 2. Mounting Protocol

Every remote MFE must export a `mount` function from its entry point (`./index`).

```typescript
export function mount(
  el: HTMLElement,
  options: {
    initialSelection?: Selection | null;
    auth?: AuthClient;
    eventTarget?: EventTarget;
  }
): UnmountFunction;
```

## 3. Infrastructure Standards

### Port Mapping

| MFE          | Local Port | Remote Scope        |
| ------------ | ---------- | ------------------- |
| Shell        | 3000       | `shell`             |
| Lineage      | 3001       | `lineage`           |
| Table Detail | 3002       | `tableDetailViewer` |

### Webpack Requirements

To avoid chunk loading issues (404), remotes must use an absolute `publicPath` in development:

```javascript
// webpack.config.js
module.exports = {
  output: {
    publicPath: "http://localhost:3002/", // Map to correct port
  },
  experiments: {
    importMeta: true,
  },
};
```

## 4. Development Workflow

1. **Define First**: If adding a new field to `Selection`, update this document and the types in _both_ `lineage` and `table-detail-viewer`.
2. **Backward Compatibility**: Always treat fields like `tableName` as optional and provide fallbacks using `id`.
3. **Logging**: Maintain `[MFE-Name] ...` prefix in console logs for easier debugging and auditing.

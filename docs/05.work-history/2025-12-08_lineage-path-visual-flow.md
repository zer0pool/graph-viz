---
status: shipped
owner: huey
created: 2025-12-08
updated: 2025-12-08
version: 1.0
related: [2025-12-07_lineage-insight-panel]
tags: [lineage-ui,drawer,cytoscape]
---

Created: 2025-12-08  
Updated: 2025-12-08  
Author: Huey (Data Platform)  
Version: 1.0  
Status: Shipped  
Title: Lineage Path Drawer Visual Refresh

Summary:  
Refined the Lineage drawer so long paths are easier to scan, added collapse/expand controls,
and implemented two interchangeable flow animations (CSS dash vs. SVG particle) for the
waterfall connectors. Documenting the behavior, implementation details, and toggling
instructions for future contributors.

---

## 1. Purpose
- Improve readability of long lineage paths inside the drawer.
- Provide interaction affordances (collapse/expand) to avoid scroll fatigue.
- Add motion cues that communicate data flow while allowing fast experimentation
  between animation styles.

## 2. Background
The previous drawer rendered every node with a single-column list and static
black connectors. Long paths (>5 nodes) forced users to scroll, and there was no
focus on the directional flow. The product review requested:
- Waterfall indentation that mirrors Git-style DAG readers.
- Collapse preview when paths exceed ~3 nodes.
- A “flowing” animation similar to Airflow runners.

## 3. Update Summary
### 3.1 Collapsible Path Blocks
- Added per-path collapse state with a default threshold of 3 nodes (`PATH_COLLAPSE_THRESHOLD`).
- Each block now shows “(n more…)” plus a toggle button (`Show full path ▸ / Hide path ◂`).
- Collapse state survives re-render while the drawer stays open.

### 3.2 Waterfall Layout + Spacing
- Introduced `indentStep`, `nodeSpacing`, and `labelGap` constants to
  render L-shaped connectors with consistent spacing (center-aligned vertical leg
  and labels 12px from the marker).
- Drawer title reflects node count per path.

### 3.3 Flow Animation Styles
- Defined `PATH_FLOW_STYLE` (defaults to `"particle"` unless
  `window.LINEAGE_FLOW_STYLE` overrides it).
- `"particle"` mode renders SVG `<animateMotion>` particles that traverse each connector path.
- `"dash"` mode reuses the legacy CSS animation (`.path-connector-flow` keyframes).
- Styles can be toggled live in the console:
  ```js
  window.LINEAGE_FLOW_STYLE = "dash"; // or "particle"
  location.reload();
  ```

### 3.4 CSS Adjustments
- Restored the dashed-flow keyframes (`@keyframes path-flow`) for compatibility.
- Added utility classes for the “(n more…)” text and toggle buttons.

## 4. Implementation Notes
- All logic lives inside `src/lineage_manager/static/js/app/ui/lineageInsightProvider.js`.
- Each connector receives a unique id when particles are enabled so `<mpath>` can reference it.
- Collapse state stored in `this.pathCollapseState` keyed by `path-${index}`.
- Spinner + deferred render already handled by `showPathDrawer()`.

## 5. Next Steps
- Consider persisting `PATH_FLOW_STYLE` to user settings instead of relying on console overrides.
- Evaluate performance if we increase the path preview threshold or add virtualization for
  extremely long drawers.

## 6. Change Log
- **2025-12-08 v1.0** — Initial documentation for lineage path visual refresh.

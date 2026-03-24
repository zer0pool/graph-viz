# Comprehensive Technical Specification: Graph Folding & Progressive Expansion

This document provides a deep-dive into the technical architecture, logic flows, and edge-case handling for the **Graph Folding** and **Progressive Expansion** features in the Lineage Micro-Frontend (MFE).

---

## 1. Objective & Design Philosophy

The primary goal is to provide a scalable way to explore massive data lineage graphs without overwhelming the user's cognitive load or the browser's rendering engine.

### Design Principles:

- **Progressive Disclosure**: Only show the most immediate neighbors; hide the rest until requested.
- **Context Preservation**: Always keep the "Anchor" node visible and centered.
- **State Integrity**: Expansion/Folding should be reversible (Undo/Redo) and consistent across re-renders.
- **Performance**: Minimize Mermaid re-renders by efficiently merging graph subsets.

---

## 2. Core Terminology

- **Anchor Node**: The specific node currently being used as the reference point for folding/expansion (usually the last node interacted with or searched for).
- **Folding**: The process of taking a large set of nodes and replacing them with a single "Group Node".
- **Incremental Expansion**: Re-calculating visibility to reveal a specific "batch" (limit) of hidden nodes from a group.
- **Downstream/Upstream**: Defined relative to the Anchor. Upstream nodes are sources (pointing TO anchor); Downstream nodes are targets (pointing FROM anchor).

---

## 3. Technical Components

### 3.1. `GraphFoldingUtils.ts` (The Engine)

This is a side-effect-free utility that implements the core math of segmenting a graph.

#### Key Function: `applyProgressiveLoading`

**Signature**: `(data: GraphState, anchorId: string, options: FoldingOptions) => GraphState`

1.  **Strict Anchor Identification**: Uses the `anchorId` to split all other nodes into three buckets: `upstreams`, `downstreams`, and `others`.
2.  **Directional Limits**: Supports independent limits for each direction (e.g., show 10 upstream but only 3 downstream).
3.  **Group Creation**: If a bucket exceeds its limit, the overflow is stored in a `GroupNode` properties.

#### Key Function: `createGroupNode`

Creates a virtual node with a unique ID format:
`__GROUP__:{anchorId}:{direction}:{timestamp}:{random}`

- **Critically**: The `direction` and `random` components prevent ID collisions when both upstream and downstream nodes are folded in the same render cycle.

### 3.2. `useGraphData.ts` (The Orchestrator)

Manages the lifecycle of graph data and the "Expansion State".

#### Logic: `expandGroup`

When a user clicks a `... more` node:

1.  Extract `remainingNodes` from the group node properties.
2.  Identify current visible count in that direction.
3.  Calculate `newLimit = currentVisibleCount + config.PROGRESSIVE_LOADING_LIMIT`.
4.  Re-apply `applyProgressiveLoading` with the increased limit for ONLY that direction.

#### Logic: `fetchGraph` (Smart Expand)

When new data arrives from the API:

1.  Merge unique new nodes/edges with the existing graph.
2.  Maintain the folding of previously expanded nodes while applying the default limit to the newly arrived data.

### 3.3. `MermaidDslService.ts` (The Translator)

Converts the internal `GraphState` into Mermaid DSL.

#### Standard: `sanitizeId`

Mermaid and CSS selectors fail on dots (`.`), colons (`:`), and leading numbers.
**Algorithm**:

- Replace all character sequences that are not `[a-zA-Z0-9]` with `_`.
- If starts with number, prepend `n_`.
- **Constraint**: This function MUST be perfectly mirrored in `useMermaidRenderer.ts` when selecting DOM elements.

---

## 4. User Experience (UX) Scenarios

### Scenario A: Initial Load (High Density)

- **User Action**: Search for a table with 50 neighbors.
- **System Behavior**:
  1.  Fetch all 50 neighbors from API.
  2.  `applyProgressiveLoading` identifies overflow.
  3.  Renders 3 nodes + 1 "47 more" group node.
- **Technical Detail**: The `anchorId` must be normalized to match the API response format (e.g., `table:full.name`).

### Scenario B: Incremental Reveal

- **User Action**: Double-click "47 more" group node.
- **System Behavior**:
  1.  `expandGroup` calculates `newLimit = 3 + 3 = 6`.
  2.  Graph re-renders showing 6 nodes + 1 "44 more" group node.
- **Technical Detail**: The `GroupNode` is removed from the visible set, hidden nodes are merged, and the entire graph is re-folded with the higher limit.

### Scenario C: Mixed Direction Exploration

- **User Action**: A dataset has 20 sources and 20 targets.
- **System Behavior**: Creates two independent group nodes.
- **Technical Detail**: If the IDs were not direction-specific, clicking one might accidentally delete or expand the other due to ID collisions in the React state or Mermaid DOM.

---

## 5. Post-Mortem: Lessons from Historical Bugs

| Bug                    | Symptom                                                   | Root Cause                                                                              | Permanent Fix                                                         |
| :--------------------- | :-------------------------------------------------------- | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Double-Prefixing**   | Folding stopped working during expansion.                 | Anchor ID was being transformed into `table:table:name`.                                | Standardized `anchorId` normalization logic in `useGraphData`.        |
| **ID Collision**       | Only one group node appeared when both directions folded. | Upstream/Downstream groups shared identical IDs (`__GROUP__:anchor`).                   | Added `:direction` and `:random` to the `groupId` generator.          |
| **Phantom Selections** | Clicking nodes didn't open the detail panel.              | `useMermaidRenderer` didn't account for `sanitizeId` logic.                             | Unified `sanitizeId` across Service and Hook for DOM matching.        |
| **Group Ghosting**     | Clicking an anchor would keep its group node visible.     | `applyProgressiveLoading` didn't filter out previous group nodes before re-calculating. | Explicitly filtering nodes by `type !== "group"` before reprocessing. |

---

## 6. Implementation Checklist for Future Reference

1.  **Limit Configuration**: Define `PROGRESSIVE_LOADING_LIMIT` in a central config.
2.  **Pure Utility**: Ensure `applyProgressiveLoading` remains pure (no state updates inside).
3.  **Unique Group IDs**: Always include direction and entropy in generated IDs.
4.  **Direction-Aware State**: Expansion logic must know if it's expanding `up` or `down` to adjust only the relevant limit.
5.  **Sanitization Sync**: If you change `sanitizeId` in the DSL service, you MUST update the DOM selection logic in the renderer.
6.  **Edge Reconstruction**: When folding, don't just hide nodes; re-calculate which edges should point to the "Group Node" vs. the "Anchor Node".

---

_Document Version: 2.0 (Deep-Dive)_
_Compiled on: 2026-01-21_

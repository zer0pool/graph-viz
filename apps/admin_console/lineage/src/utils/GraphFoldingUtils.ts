import { GraphState, GraphNode, GraphEdge } from "../types/graph";

/**
 * Graph Folding Utilities
 * Handles progressive loading and node grouping for large graphs
 */

/**
 * Create a Group Node to represent hidden/folded nodes
 */
export function createGroupNode(
  remainingNodes: GraphNode[],
  remainingEdges: GraphEdge[],
  anchorId: string,
  direction: "upstream" | "downstream",
): GraphNode {
  const count = remainingNodes.length;
  // Include direction and random to ensure uniqueness, especially when both up/down fold at once
  const groupId = `__GROUP__:${anchorId}:${direction}:${Date.now()}:${Math.floor(Math.random() * 1000)}`;
  return {
    id: groupId,
    type: "group",
    name: `... ${count} more`,
    full_name: `${count} more items`,
    properties: {
      remainingNodes,
      remainingEdges,
      anchorId,
      direction,
      count,
    },
  };
}

export interface FoldingOptions {
  upstreamLimit?: number;
  downstreamLimit?: number;
  globalLimit?: number;
}

/**
 * Apply progressive loading to a graph dataset.
 * Splits nodes into upstream/downstream relative to anchor, applies limit,
 * and creates group nodes for hidden items.
 */
export function applyProgressiveLoading(
  data: GraphState,
  anchorId: string,
  options: FoldingOptions | number,
): GraphState {
  // Normalize settings
  let upLimit: number;
  let downLimit: number;

  if (typeof options === "number") {
    upLimit = downLimit = options;
  } else {
    const global = options.globalLimit || 3;
    upLimit = options.upstreamLimit ?? global;
    downLimit = options.downstreamLimit ?? global;
  }

  const anchorNode = data.nodes.find((n) => n.id === anchorId);
  if (!anchorNode) {
    console.warn(
      "[GraphFolding] Anchor node not found in data nodes. ID:",
      anchorId,
    );
  }
  const otherNodes = data.nodes.filter((n) => n.id !== anchorId);

  console.log("[GraphFolding] Anchor:", anchorId, "Found:", !!anchorNode);
  console.log(
    "[GraphFolding] Options - UpLimit:",
    upLimit,
    "DownLimit:",
    downLimit,
  );

  // Split into upstream/downstream relative to anchor
  const upstreams = otherNodes.filter((n) =>
    data.edges.some((e) => e.source === n.id && e.target === anchorId),
  );
  const downstreams = otherNodes.filter((n) =>
    data.edges.some((e) => e.source === anchorId && e.target === n.id),
  );
  const others = otherNodes.filter(
    (n) => !upstreams.includes(n) && !downstreams.includes(n),
  );

  // Check if folding is needed
  const needsFolding =
    upstreams.length > upLimit || downstreams.length > downLimit;

  console.log(
    "[GraphFolding] Counts - Up:",
    upstreams.length,
    "Down:",
    downstreams.length,
  );
  console.log("[GraphFolding] Needs folding?", needsFolding);

  if (!needsFolding) {
    return data;
  }

  const finalNodes: GraphNode[] = anchorNode ? [anchorNode] : [];
  const finalEdges: GraphEdge[] = [];

  finalNodes.push(...others);

  // Handle upstreams
  if (upstreams.length > upLimit) {
    const visible = upstreams.slice(0, upLimit);
    const hidden = upstreams.slice(upLimit);
    const hiddenIds = new Set(hidden.map((n) => n.id));

    finalNodes.push(...visible);
    const hiddenEdges = data.edges.filter(
      (e) => hiddenIds.has(e.source) || hiddenIds.has(e.target),
    );
    const groupNode = createGroupNode(
      hidden,
      hiddenEdges,
      anchorId,
      "upstream",
    );
    console.log(
      "[GraphFolding] Created UPSTREAM group node:",
      groupNode.id,
      "hiding:",
      hidden.length,
    );
    finalNodes.push(groupNode);

    finalEdges.push(
      ...data.edges.filter(
        (e) => visible.some((v) => v.id === e.source) && e.target === anchorId,
      ),
    );
    finalEdges.push({
      source: groupNode.id,
      target: anchorId,
      type: "group-edge",
    });
  } else {
    finalNodes.push(...upstreams);
    finalEdges.push(
      ...data.edges.filter(
        (e) =>
          upstreams.some((u) => u.id === e.source) && e.target === anchorId,
      ),
    );
  }

  // Handle downstreams
  if (downstreams.length > downLimit) {
    const visible = downstreams.slice(0, downLimit);
    const hidden = downstreams.slice(downLimit);
    const hiddenIds = new Set(hidden.map((n) => n.id));

    finalNodes.push(...visible);
    const hiddenEdges = data.edges.filter(
      (e) => hiddenIds.has(e.source) || hiddenIds.has(e.target),
    );
    const groupNode = createGroupNode(
      hidden,
      hiddenEdges,
      anchorId,
      "downstream",
    );
    console.log(
      "[GraphFolding] Created DOWNSTREAM group node:",
      groupNode.id,
      "hiding:",
      hidden.length,
    );
    finalNodes.push(groupNode);

    finalEdges.push(
      ...data.edges.filter(
        (e) => e.source === anchorId && visible.some((v) => v.id === e.target),
      ),
    );
    finalEdges.push({
      source: anchorId,
      target: groupNode.id,
      type: "group-edge",
    });
  } else {
    finalNodes.push(...downstreams);
    finalEdges.push(
      ...data.edges.filter(
        (e) =>
          e.source === anchorId && downstreams.some((d) => d.id === e.target),
      ),
    );
  }

  // Add common edges
  const currentVisibleIds = new Set(finalNodes.map((n) => n.id));
  data.edges.forEach((e) => {
    if (currentVisibleIds.has(e.source) && currentVisibleIds.has(e.target)) {
      if (
        !finalEdges.some(
          (fe) => fe.source === e.source && fe.target === e.target,
        )
      ) {
        finalEdges.push(e);
      }
    }
  });

  return { nodes: finalNodes, edges: finalEdges };
}

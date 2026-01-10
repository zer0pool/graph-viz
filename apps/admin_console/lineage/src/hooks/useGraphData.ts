import { useState, useCallback } from "react";
import { GraphState, GraphNode, GraphEdge } from "../types/graph";
import { GraphApiService } from "../services/GraphApiService";
import { useGraphHistory } from "./useGraphHistory";
import { config } from "../config";

export function useGraphData() {
  const [graphData, setGraphData] = useState<GraphState | null>(null);
  const [initialNode, setInitialNode] = useState<{
    type: string;
    id: string;
  } | null>(null);

  // Initialize loading to true if URL parameters are present to avoid flash of empty state
  const [loading, setLoading] = useState(() => {
    // Check full href for params (covers hash router and normal search)
    const href = window.location.href;
    return href.includes("node_id=") || href.includes("table_name=");
  });

  const [error, setError] = useState<string | null>(null);

  const {
    pushToHistory,
    resetHistory,
    undo: historyUndo,
    redo: historyRedo,
    canUndo,
    canRedo,
  } = useGraphHistory();

  // Helper to create a Group Node
  const createGroupNode = (
    remainingNodes: GraphNode[],
    remainingEdges: GraphEdge[],
    anchorId: string, // The node we expanded FROM (optional, but good for positioning if using special layout)
    direction: "upstream" | "downstream"
  ): GraphNode => {
    const count = remainingNodes.length;
    const groupId = `__GROUP__:${anchorId}:${Date.now()}`; // Unique ID
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
  };

  const fetchGraph = useCallback(
    async (
      type: string,
      id: string,
      isExpansion = false,
      direction: "upstream" | "downstream" | "both" = "both",
      rememberAsInitial = false
    ) => {
      if (rememberAsInitial) {
        setInitialNode({ type, id });
      }

      const startTime = Date.now();
      if (!isExpansion) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await GraphApiService.fetchExpand(type, id, direction);

        if (isExpansion) {
          setGraphData((prev) => {
            if (!prev) {
              pushToHistory(data);
              return data;
            }

            const limit = config.PROGRESSIVE_LOADING_LIMIT;
            const newNodes: GraphNode[] = [];
            const hiddenNodes: GraphNode[] = [];

            // Filter out existing nodes
            const uniqueNewNodes = data.nodes.filter(
              (n) => !prev.nodes.some((existing) => existing.id === n.id)
            );

            // Progressive Logic:
            // Only if we found new nodes > limit
            if (uniqueNewNodes.length > limit) {
              // We take 'limit' nodes
              newNodes.push(...uniqueNewNodes.slice(0, limit));
              // The rest are hidden
              hiddenNodes.push(...uniqueNewNodes.slice(limit));
            } else {
              newNodes.push(...uniqueNewNodes);
            }

            // Edges must behave similarly.
            // We only add edges that connect to visible nodes (existing or newly added visible ones).
            // Hidden edges go to the group node conceptually, or we store them.

            const visibleNodeIds = new Set([
              ...prev.nodes.map((n) => n.id),
              ...newNodes.map((n) => n.id),
            ]);

            const newEdges: GraphEdge[] = [];
            const hiddenEdges: GraphEdge[] = [];

            data.edges.forEach((e) => {
              // If exists, skip
              if (
                prev.edges.some(
                  (existing) =>
                    existing.source === e.source && existing.target === e.target
                )
              )
                return;

              const sourceVisible =
                visibleNodeIds.has(e.source) || e.source === id; // id is the expanded node (anchor)
              const targetVisible =
                visibleNodeIds.has(e.target) || e.target === id;

              // Note: The 'anchor' (id) is definitely visible.
              // The 'other' side must be one of the new nodes.
              // If the 'other' side is in 'hiddenNodes', then this edge is hidden.

              const isHiddenSource = hiddenNodes.some((n) => n.id === e.source);
              const isHiddenTarget = hiddenNodes.some((n) => n.id === e.target);

              if (isHiddenSource || isHiddenTarget) {
                hiddenEdges.push(e);
              } else {
                newEdges.push(e);
              }
            });

            // If we have hidden nodes, create a group node
            if (hiddenNodes.length > 0) {
              const groupNode = createGroupNode(
                hiddenNodes,
                hiddenEdges,
                id,
                direction as any
              );
              newNodes.push(groupNode);

              // Add edge to group node
              if (direction === "upstream" || direction === "both") {
                // For upstream expansion, items are upstream OF the anchor.
                // edge: item -> anchor.
                // group edge: group -> anchor
                // BUT mermaid might need specific direction.
                // Let's assume standard behavior: we just add an edge connecting 'group' and 'id'.
                // Actually direction helps determine source/target.
                // If expanding upstream: New items -> Anchor. Edge: Group -> Anchor.
                // If expanding downstream: Anchor -> New items. Edge: Anchor -> Group.
                if (
                  uniqueNewNodes.some((n) =>
                    data.edges.some((e) => e.source === n.id && e.target === id)
                  )
                ) {
                  newEdges.push({
                    source: groupNode.id,
                    target: id,
                    type: "group-edge",
                  });
                }
              }
              if (direction === "downstream" || direction === "both") {
                // downstream: anchor -> item
                // edge: anchor -> group
                if (
                  uniqueNewNodes.some((n) =>
                    data.edges.some((e) => e.source === id && e.target === n.id)
                  )
                ) {
                  newEdges.push({
                    source: id,
                    target: groupNode.id,
                    type: "group-edge",
                  });
                }
              }
            }

            const finalNodes = [...prev.nodes, ...newNodes];
            const finalEdges = [...prev.edges, ...newEdges];

            const newState = { nodes: finalNodes, edges: finalEdges };
            // Move pushToHistory to the next tick to avoid calling it during render/state update
            setTimeout(() => pushToHistory(newState), 0);
            return newState;
          });
        } else {
          setGraphData(data);
          resetHistory(data);
        }
      } catch (err: any) {
        console.error("Error fetching graph:", err);
        setError(err.message);
      } finally {
        if (!isExpansion) {
          // Ensure minimum 1 second loading time to prevent flickering only for full reloads
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, 1000 - elapsed);
          setTimeout(() => setLoading(false), remainingTime);
        } else {
          setLoading(false);
        }
      }
    },
    [pushToHistory, resetHistory]
  );

  const expandGroup = useCallback(
    (groupNode: GraphNode) => {
      setGraphData((prev) => {
        if (!prev) return null;

        const props = groupNode.properties || {};
        const hiddenNodes: GraphNode[] = props.remainingNodes || [];
        const hiddenEdges: GraphEdge[] = props.remainingEdges || [];
        const limit = config.PROGRESSIVE_LOADING_LIMIT;

        if (hiddenNodes.length === 0) return prev;

        const nodesToShow = hiddenNodes.slice(0, limit);
        const nodesUnknown = hiddenNodes.slice(limit);

        // Edges to show: edges connecting nodesToShow ??
        // We stored 'remainingEdges'. We need to filter those that connect to 'nodesToShow'.
        // Connection is relative to Anchor usually.

        // Actually, we just need to add the edges related to nodesToShow.
        const idsToShow = new Set(nodesToShow.map((n) => n.id));
        const edgesToShow = hiddenEdges.filter(
          (e) => idsToShow.has(e.source) || idsToShow.has(e.target)
        );

        const edgesUnknown = hiddenEdges.filter(
          (e) => !edgesToShow.includes(e)
        );

        // Prepare new state
        let nextNodes = prev.nodes.filter((n) => n.id !== groupNode.id); // Remove current group node
        nextNodes.push(...nodesToShow);

        let nextEdges = prev.edges.filter(
          (e) => e.source !== groupNode.id && e.target !== groupNode.id
        ); // Remove group edges
        nextEdges.push(...edgesToShow);

        // If still more nodes, add new group node
        if (nodesUnknown.length > 0) {
          const newGroupNode = createGroupNode(
            nodesUnknown,
            edgesUnknown,
            props.anchorId,
            props.direction
          );
          nextNodes.push(newGroupNode);

          // Add edge to new group
          if (props.direction === "upstream" || props.direction === "both") {
            // Heuristic: check if any hidden edge targeted anchor
            nextEdges.push({
              source: newGroupNode.id,
              target: props.anchorId,
              type: "group-edge",
            });
          }
          if (props.direction === "downstream" || props.direction === "both") {
            nextEdges.push({
              source: props.anchorId,
              target: newGroupNode.id,
              type: "group-edge",
            });
          }
        }

        const newState = { nodes: nextNodes, edges: nextEdges };
        setTimeout(() => pushToHistory(newState), 0);
        return newState;
      });
    },
    [pushToHistory]
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setGraphData((prev) => {
        if (!prev) return null;
        const newState = {
          nodes: prev.nodes.filter((n) => n.id !== nodeId),
          edges: prev.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
        };
        setTimeout(() => pushToHistory(newState), 0);
        return newState;
      });
    },
    [pushToHistory]
  );

  const restoreFromHistory = useCallback((state: GraphState | null) => {
    if (state) setGraphData(state);
  }, []);

  const handleUndo = useCallback(() => {
    const prevState = historyUndo();
    restoreFromHistory(prevState);
  }, [historyUndo, restoreFromHistory]);

  const handleRedo = useCallback(() => {
    const nextState = historyRedo();
    restoreFromHistory(nextState);
  }, [historyRedo, restoreFromHistory]);

  const resetToInitial = useCallback(() => {
    if (initialNode) {
      fetchGraph(initialNode.type, initialNode.id);
    }
  }, [initialNode, fetchGraph]);

  return {
    graphData,
    loading,
    error,
    fetchGraph,
    expandGroup,
    removeNode,
    resetToInitial,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    setGraphData, // Occasionally needed for direct manipulation
  };
}

import { useState, useCallback } from "react";
import { GraphState, GraphNode, GraphEdge } from "../types/graph";
import { GraphApiService } from "../services/GraphApiService";
import { useGraphHistory } from "./useGraphHistory";
import { config } from "../config";
import {
  createGroupNode,
  applyProgressiveLoading,
} from "../utils/GraphFoldingUtils";

export function useGraphData() {
  const [graphData, setGraphData] = useState<GraphState | null>(null);
  const [initialNode, setInitialNode] = useState<{
    type: string;
    id: string;
  } | null>(null);

  const [loading, setLoading] = useState(() => {
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

  const fetchGraph = useCallback(
    async (
      type: string,
      id: string,
      isExpansion = false,
      direction: "upstream" | "downstream" | "both" = "both",
      rememberAsInitial = false,
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
          setGraphData((prev: GraphState | null) => {
            if (!prev) return data;

            const fullId = id.includes(":") ? id : `${type}:${id}`;

            // 1. Extract any hidden nodes from existing group nodes for this anchor/direction
            // This is crucial for correctly "unfolding" during expansion.
            let baseNodes = [...prev.nodes];
            let baseEdges = [...prev.edges];

            const groupNodes = prev.nodes.filter(
              (n) =>
                n.type === "group" &&
                n.properties?.anchorId === fullId &&
                (direction === "both" || n.properties?.direction === direction),
            );

            groupNodes.forEach((gn) => {
              if (gn.properties?.remainingNodes) {
                baseNodes.push(...gn.properties.remainingNodes);
                baseEdges.push(...gn.properties.remainingEdges);
              }
              // Remove the group node itself from the base set
              baseNodes = baseNodes.filter((n) => n.id !== gn.id);
              baseEdges = baseEdges.filter(
                (e) => e.source !== gn.id && e.target !== gn.id,
              );
            });

            // 2. Merge new API data
            const existingNodeIds = new Set(baseNodes.map((n) => n.id));
            const uniqueNewNodes = data.nodes.filter(
              (n: any) => !existingNodeIds.has(n.id),
            );
            const existingEdgeKeys = new Set(
              baseEdges.map((e) => `${e.source}->${e.target}`),
            );
            const uniqueNewEdges = data.edges.filter(
              (e: any) => !existingEdgeKeys.has(`${e.source}->${e.target}`),
            );

            const combinedNodes = [...baseNodes, ...uniqueNewNodes];
            const combinedEdges = [...baseEdges, ...uniqueNewEdges];

            // 3. Determine current visible counts to calculate new limit
            const upCount = prev.nodes.filter((n: any) => {
              if (n.type === "group" || n.id === fullId) return false;
              return prev.edges.some(
                (e: any) => e.source === n.id && e.target === fullId,
              );
            }).length;

            const downCount = prev.nodes.filter((n: any) => {
              if (n.type === "group" || n.id === fullId) return false;
              return prev.edges.some(
                (e: any) => e.source === fullId && e.target === n.id,
              );
            }).length;

            const limit = config.PROGRESSIVE_LOADING_LIMIT;

            // 4. Re-apply folding with increased limit for this expansion
            const options = {
              upstreamLimit:
                direction === "upstream" || direction === "both"
                  ? upCount + limit
                  : upCount,
              downstreamLimit:
                direction === "downstream" || direction === "both"
                  ? downCount + limit
                  : downCount,
              globalLimit: limit,
            };

            const newState = applyProgressiveLoading(
              { nodes: combinedNodes, edges: combinedEdges },
              fullId,
              options,
            );

            setTimeout(() => pushToHistory(newState), 0);
            return newState;
          });
        } else {
          // INITIAL LOAD
          const limit = config.PROGRESSIVE_LOADING_LIMIT;
          const fullNodeId = id.includes(":") ? id : `${type}:${id}`;
          console.log(
            "[useGraphData] Initial load for:",
            fullNodeId,
            "Limit:",
            limit,
          );
          const foldedData = applyProgressiveLoading(data, fullNodeId, limit);
          setGraphData(foldedData);
          resetHistory(foldedData);
        }
      } catch (err: any) {
        console.error("Error fetching graph:", err);
        setError(err.message);
      } finally {
        if (!isExpansion) {
          const elapsed = Date.now() - startTime;
          const remainingTime = Math.max(0, 1000 - elapsed);
          setTimeout(() => setLoading(false), remainingTime);
        } else {
          setLoading(false);
        }
      }
    },
    [pushToHistory, resetHistory],
  );

  const expandGroup = useCallback(
    (groupNode: GraphNode) => {
      setGraphData((prev: GraphState | null) => {
        if (!prev) return null;

        const props = groupNode.properties || {};
        const remainingNodes: GraphNode[] = props.remainingNodes || [];
        const remainingEdges: GraphEdge[] = props.remainingEdges || [];
        const anchorId = props.anchorId;
        const direction = props.direction;
        const limit = config.PROGRESSIVE_LOADING_LIMIT;

        // 1. Remove the current group node and its edges
        const filteredNodes = prev.nodes.filter((n) => n.id !== groupNode.id);
        const filteredEdges = prev.edges.filter(
          (e) => e.source !== groupNode.id && e.target !== groupNode.id,
        );

        // 2. Calculate current visible counts in expansion direction
        const currentUpstreams = filteredNodes.filter((n) =>
          filteredEdges.some((e) => e.source === n.id && e.target === anchorId),
        ).length;
        const currentDownstreams = filteredNodes.filter((n) =>
          filteredEdges.some((e) => e.source === anchorId && e.target === n.id),
        ).length;

        // 3. Combine existing nodes with hidden items from group
        const combinedNodes = [...filteredNodes, ...remainingNodes];
        const combinedEdges = [...filteredEdges, ...remainingEdges];

        // 4. Set new increased limits for the expansion direction
        const options = {
          upstreamLimit:
            direction === "upstream"
              ? currentUpstreams + limit
              : currentUpstreams,
          downstreamLimit:
            direction === "downstream"
              ? currentDownstreams + limit
              : currentDownstreams,
          globalLimit: limit,
        };

        // 5. Re-apply folding logic
        const tempState = { nodes: combinedNodes, edges: combinedEdges };
        const newState = applyProgressiveLoading(tempState, anchorId, options);
        console.log(
          "[useGraphData] Expanded group node. New visible count:",
          newState.nodes.length,
        );

        setTimeout(() => pushToHistory(newState), 0);
        return newState;
      });
    },
    [pushToHistory],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setGraphData((prev: GraphState | null) => {
        if (!prev) return null;
        const newState = {
          nodes: prev.nodes.filter((n) => n.id !== nodeId),
          edges: prev.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
          ),
        };
        setTimeout(() => pushToHistory(newState), 0);
        return newState;
      });
    },
    [pushToHistory],
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
    setGraphData,
  };
}

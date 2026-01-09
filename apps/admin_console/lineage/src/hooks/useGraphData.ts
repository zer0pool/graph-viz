import { useState, useCallback } from "react";
import { GraphState, GraphNode } from "../types/graph";
import { GraphApiService } from "../services/GraphApiService";
import { useGraphHistory } from "./useGraphHistory";

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

            const newNodes = [...prev.nodes];
            data.nodes.forEach((n) => {
              if (!newNodes.some((existing) => existing.id === n.id))
                newNodes.push(n);
            });

            const newEdges = [...prev.edges];
            data.edges.forEach((e) => {
              if (
                !newEdges.some(
                  (existing) =>
                    existing.source === e.source && existing.target === e.target
                )
              ) {
                newEdges.push(e);
              }
            });

            const newState = { nodes: newNodes, edges: newEdges };
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
    removeNode,
    resetToInitial,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
    setGraphData, // Occasionally needed for direct manipulation
  };
}

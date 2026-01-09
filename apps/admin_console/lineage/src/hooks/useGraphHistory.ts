import { useState, useCallback, useMemo, useRef } from "react";
import { GraphState } from "../types/graph";

export function useGraphHistory(initialState?: GraphState) {
  const [history, setHistory] = useState<GraphState[]>(
    initialState ? [initialState] : []
  );
  const [historyIndex, setHistoryIndex] = useState(0);

  // Use a ref to track the index for stable callbacks
  const indexRef = useRef(0);

  const pushToHistory = useCallback((state: GraphState) => {
    setHistory((prev) => {
      // Deduplicate: Compare with current head
      const currentHead = prev[indexRef.current];
      if (
        currentHead &&
        JSON.stringify(currentHead) === JSON.stringify(state)
      ) {
        return prev;
      }

      const newHistory = prev.slice(0, indexRef.current + 1);
      newHistory.push(state);
      const nextIdx = newHistory.length - 1;
      indexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      return newHistory;
    });
  }, []);

  const resetHistory = useCallback((state: GraphState) => {
    setHistory([state]);
    indexRef.current = 0;
    setHistoryIndex(0);
  }, []);

  const undo = useCallback((): GraphState | null => {
    if (indexRef.current > 0) {
      indexRef.current -= 1;
      setHistoryIndex(indexRef.current);
      // We'll let the consumer use the history state or we can return the item if we depend on history
      // But keeping it stable is more important for the infinite loop fix.
      // However, useGraphData expects the state.
      // So we use a functional update pattern or just keep history in deps for undo/redo.
    }
    return null;
  }, []);

  const redo = useCallback((): GraphState | null => {
    if (indexRef.current < history.length - 1) {
      indexRef.current += 1;
      setHistoryIndex(indexRef.current);
    }
    return null;
  }, [history.length]);

  return useMemo(
    () => ({
      pushToHistory,
      undo: () => {
        if (indexRef.current > 0) {
          const nextIdx = indexRef.current - 1;
          indexRef.current = nextIdx;
          setHistoryIndex(nextIdx);
          return history[nextIdx];
        }
        return null;
      },
      redo: () => {
        if (indexRef.current < history.length - 1) {
          const nextIdx = indexRef.current + 1;
          indexRef.current = nextIdx;
          setHistoryIndex(nextIdx);
          return history[nextIdx];
        }
        return null;
      },
      resetHistory,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      historyIndex,
      historyLength: history.length,
    }),
    [pushToHistory, resetHistory, historyIndex, history]
  );
}

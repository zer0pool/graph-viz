import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useGraphHistory } from "../useGraphHistory";
import { GraphState } from "../../types/graph";

const state1: GraphState = {
  nodes: [{ id: "n1", type: "table", name: "Node 1" }],
  edges: [],
};

const state2: GraphState = {
  nodes: [
    { id: "n1", type: "table", name: "Node 1" },
    { id: "n2", type: "table", name: "Node 2" },
  ],
  edges: [{ source: "n1", target: "n2" }],
};

const state3: GraphState = {
  nodes: [{ id: "n3", type: "job", name: "Job 3" }],
  edges: [],
};

describe("useGraphHistory", () => {
  it("should initialize with empty state if no initial state provided", () => {
    const { result } = renderHook(() => useGraphHistory());
    expect(result.current.historyLength).toBe(0);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should initialize with initial state if provided", () => {
    const { result } = renderHook(() => useGraphHistory(state1));
    expect(result.current.historyLength).toBe(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should push new states to history", () => {
    const { result } = renderHook(() => useGraphHistory(state1));

    act(() => {
      result.current.pushToHistory(state2);
    });

    expect(result.current.historyLength).toBe(2);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("should not push duplicate states to history", () => {
    const { result } = renderHook(() => useGraphHistory(state1));

    act(() => {
      result.current.pushToHistory(state1);
    });

    expect(result.current.historyLength).toBe(1);
  });

  it("should undo and redo correctly", () => {
    const { result } = renderHook(() => useGraphHistory(state1));

    act(() => {
      result.current.pushToHistory(state2);
    });

    act(() => {
      result.current.pushToHistory(state3);
    });

    expect(result.current.historyLength).toBe(3);
    expect(result.current.historyIndex).toBe(2);

    let undoneState: GraphState | null = null;
    act(() => {
      undoneState = result.current.undo();
    });

    expect(undoneState).toEqual(state2);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      undoneState = result.current.undo();
    });

    expect(undoneState).toEqual(state1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canUndo).toBe(false);

    let redoneState: GraphState | null = null;
    act(() => {
      redoneState = result.current.redo();
    });

    expect(redoneState).toEqual(state2);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it("should truncate history when pushing after undo", () => {
    const { result } = renderHook(() => useGraphHistory(state1));

    act(() => {
      result.current.pushToHistory(state2);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.historyLength).toBe(2);
    expect(result.current.historyIndex).toBe(0);

    act(() => {
      result.current.pushToHistory(state3);
    });

    expect(result.current.historyLength).toBe(2);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canRedo).toBe(false);

    // redo should return null
    let redoneState: GraphState | null = null;
    act(() => {
      redoneState = result.current.redo();
    });
    expect(redoneState).toBeNull();
  });

  it("should reset history", () => {
    const { result } = renderHook(() => useGraphHistory(state1));

    act(() => {
      result.current.pushToHistory(state2);
    });

    act(() => {
      result.current.resetHistory(state3);
    });

    expect(result.current.historyLength).toBe(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it("should return null on undo when at start of history", () => {
    const { result } = renderHook(() => useGraphHistory(state1));
    let undoneState: GraphState | null = null;
    act(() => {
      undoneState = result.current.undo();
    });
    expect(undoneState).toBeNull();
  });

  it("should return null on redo when at end of history", () => {
    const { result } = renderHook(() => useGraphHistory(state1));
    let redoneState: GraphState | null = null;
    act(() => {
      redoneState = result.current.redo();
    });
    expect(redoneState).toBeNull();
  });
});

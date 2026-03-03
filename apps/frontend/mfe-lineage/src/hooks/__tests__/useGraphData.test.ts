import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGraphData } from "../useGraphData";
import { GraphApiService } from "../../services/GraphApiService";
import { mockGraphData } from "@/test/mocks/graphData";

vi.mock("../../services/GraphApiService");

describe("useGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useGraphData());
    expect(result.current.graphData).toBeNull();
    // Default depends on URL, but in test it's false
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should fetch graph data and apply initial folding", async () => {
    const mockData = mockGraphData({ upstreamCount: 10 });
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue(mockData);

    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "root", false, "both", true);
    });

    await waitFor(
      () => {
        expect(result.current.graphData).not.toBeNull();
        expect(result.current.graphData?.nodes).toHaveLength(5);
      },
      { timeout: 3000 }
    );

    // Test resetToInitial
    vi.mocked(GraphApiService.fetchExpand).mockClear();
    await act(async () => {
      result.current.resetToInitial();
    });
    expect(GraphApiService.fetchExpand).toHaveBeenCalled();
  });

  it("should handle fetch errors", async () => {
    vi.mocked(GraphApiService.fetchExpand).mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "root");
    });

    expect(result.current.error).toBe("Network Error");

    // Account for the 1s anti-flicker delay
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it("should handle expansion with progressive limits", async () => {
    const initialData = mockGraphData({ upstreamCount: 10 });
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue(initialData);

    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "root");
    });

    // Wait for initial load to finish loading
    await waitFor(() => expect(result.current.loading).toBe(false), {
      timeout: 3000,
    });

    const expansionData = { nodes: [], edges: [] };
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue(expansionData);

    await act(async () => {
      await result.current.fetchGraph("table", "root", true, "upstream");
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(
      () => {
        expect(result.current.graphData?.nodes).toHaveLength(8);
      },
      { timeout: 3000 }
    );
  });

  it("should handle group node expansion", async () => {
    const data = mockGraphData({ upstreamCount: 5 });
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue(data);

    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "root");
    });

    // Wait for initial load
    await waitFor(() => expect(result.current.loading).toBe(false), {
      timeout: 3000,
    });

    const groupNode = result.current.graphData?.nodes.find((n) => n.type === "group");
    expect(groupNode).toBeDefined();

    await act(async () => {
      result.current.expandGroup(groupNode!);
      await new Promise((r) => setTimeout(r, 50));
    });

    await waitFor(
      () => {
        expect(result.current.graphData?.nodes).toHaveLength(6);
      },
      { timeout: 3000 }
    );
  });

  it("should support removing nodes", async () => {
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue({
      nodes: [
        { id: "n1", type: "table", name: "n1" },
        { id: "n2", type: "table", name: "n2" },
      ],
      edges: [{ source: "n1", target: "n2" }],
    });
    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "n1");
    });

    act(() => {
      result.current.removeNode("n1");
    });

    expect(result.current.graphData?.nodes).toHaveLength(1);
    expect(result.current.graphData?.edges).toHaveLength(0);
  });

  it("should support undo/redo", async () => {
    vi.mocked(GraphApiService.fetchExpand).mockResolvedValue({
      nodes: [{ id: "root", type: "table", name: "root" }],
      edges: [],
    });
    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchGraph("table", "root");
    });

    act(() => {
      result.current.removeNode("root");
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.graphData?.nodes).toHaveLength(1);

    act(() => {
      result.current.redo();
    });
    expect(result.current.graphData?.nodes).toHaveLength(0);
  });
});

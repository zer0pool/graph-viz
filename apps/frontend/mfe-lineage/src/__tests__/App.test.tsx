import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App";
import { useGraphData } from "../hooks/useGraphData";
import { useMermaidRenderer } from "../hooks/useMermaidRenderer";
import React from "react";

// Mock hooks
vi.mock("../hooks/useGraphData");
vi.mock("../hooks/useMermaidRenderer");
vi.mock("../hooks/useGraphExport", () => ({
  useGraphExport: () => ({ handleDownload: vi.fn() }),
}));

// Mock ListView to test onSelectNode
vi.mock("../components/ListView/ListView", () => ({
  ListView: ({ onSelectNode, listActionRef }: any) => {
    // Expose reload/exportCsv to the ref
    if (listActionRef) {
      listActionRef.current = {
        reload: vi.fn(),
        exportCsv: vi.fn(),
      };
    }
    return (
      <div data-testid="list-view">
        <button
          onClick={() =>
            onSelectNode({
              id: "t1",
              type: "table",
              name: "T1",
              full_name: "db.schema.T1",
            })
          }
        >
          Select Table
        </button>
        <button onClick={() => onSelectNode({ id: "j1", type: "job", name: "J1" })}>
          Select Job
        </button>
      </div>
    );
  },
}));

describe("App", () => {
  const mockFetchGraph = vi.fn();
  const mockResetToInitial = vi.fn();
  const mockFitToView = vi.fn();
  const mockZoomIn = vi.fn();
  const mockZoomOut = vi.fn();
  const mockResetView = vi.fn();
  const mockUndo = vi.fn();
  const mockRedo = vi.fn();
  const mockExpandGroupScope = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(useGraphData).mockReturnValue({
      graphData: { nodes: [], edges: [] },
      loading: false,
      error: null,
      fetchGraph: mockFetchGraph,
      removeNode: vi.fn(),
      resetToInitial: mockResetToInitial,
      undo: mockUndo,
      redo: mockRedo,
      canUndo: true,
      canRedo: true,
      expandGroup: mockExpandGroupScope,
      setGraphData: vi.fn(),
    } as any);

    vi.mocked(useMermaidRenderer).mockReturnValue({
      mermaidRef: { current: document.createElement("div") },
      zoomLevel: 1.0,
      selectedNode: null,
      contextMenu: null,
      setContextMenu: vi.fn(),
      fitToView: mockFitToView,
      resetView: mockResetView,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      selectNode: vi.fn(),
      pan: { x: 0, y: 0 },
      dsl: "flowchart LR",
    } as any);
  });

  it("should render welcome message when no rootNode is provided", () => {
    render(<App />);
    expect(screen.getByText(/Welcome to Data Lineage/i)).toBeInTheDocument();
  });

  it("should handle view switching and all control bar interactions", async () => {
    vi.mocked(useGraphData).mockReturnValue({
      ...vi.mocked(useGraphData)({} as any),
      graphData: {
        nodes: [{ id: "n1", type: "table", name: "N1" }],
        edges: [{ source: "n1", target: "n2" }],
      },
    } as any);

    const { container, rerender } = render(<App rootNode={{ type: "table", id: "n1" }} />);

    // Rerender with SAME rootNode to hit coverage for same-node skip
    rerender(<App rootNode={{ type: "table", id: "n1" }} />);

    // Rerender with rootNode without id (line 111 coverage)
    rerender(<App rootNode={{ type: "table" } as any} />);

    // Rerender with DIFFERENT rootNode
    rerender(<App rootNode={{ type: "table", id: "n3" }} />);
    // Initial fetch + n3 fetch
    expect(mockFetchGraph).toHaveBeenCalledTimes(2);

    // 1. Switch to List View
    const listBtn = screen.getByTitle("List View");
    fireEvent.click(listBtn);
    expect(container.querySelector(".lineage-container")).toHaveAttribute("data-view-mode", "list");

    // 2. Switch back to Graph View
    const graphBtn = screen.getByTitle("Graph View");
    fireEvent.click(graphBtn);
    expect(container.querySelector(".lineage-container")).toHaveAttribute(
      "data-view-mode",
      "graph"
    );

    // 3. Test Zoom/Reset/Fit
    fireEvent.click(screen.getByTitle("Zoom In"));
    fireEvent.click(screen.getByTitle("Zoom Out"));
    fireEvent.click(screen.getByTitle("Fit to View"));
    fireEvent.click(screen.getByTitle("Reset Graph"));
    await waitFor(() => expect(mockResetView).toHaveBeenCalled());

    // 4. Test Layout/Orientation/Export
    const dirBtn = container.querySelector('[data-tooltip="Change Direction"]')!;
    fireEvent.click(dirBtn);
    fireEvent.click(screen.getByText("Top to bottom"));
    fireEvent.click(dirBtn); // reopen
    fireEvent.click(screen.getByText("Left to right"));
    fireEvent.mouseDown(document); // click outside

    const layoutBtn = container.querySelector('[data-tooltip="Change Layout"]')!;
    fireEvent.click(layoutBtn);
    fireEvent.click(screen.getByText("Adaptive"));
    fireEvent.click(layoutBtn); // reopen
    fireEvent.click(screen.getByText("Hierarchical"));
    fireEvent.mouseDown(document); // click outside

    const exportBtn = container.querySelector('[data-tooltip="Export Graph"]')!;
    fireEvent.click(exportBtn);
    fireEvent.click(screen.getByText("Download SVG"));

    fireEvent.click(exportBtn); // reopen
    fireEvent.click(screen.getByText("Copy Mermaid"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // 5. Test Expansion Controls with Selected Node
    vi.mocked(useMermaidRenderer).mockReturnValue({
      ...vi.mocked(useMermaidRenderer)({} as any),
      selectedNode: { id: "n1", type: "table", name: "N1" } as any,
    } as any);
    rerender(<App rootNode={{ type: "table", id: "n3" }} />); // Force update to use new selectedNode mock

    fireEvent.click(screen.getByTitle("Expand Upstream"));
    fireEvent.click(screen.getByTitle("Expand Downstream"));
    fireEvent.click(screen.getByText("EXPAND")); // Smart Expand
  });

  it("should handle custom events and list selection", async () => {
    const mockOnSelect = vi.fn();
    render(<App rootNode={{ type: "table", id: "n1" }} onSelect={mockOnSelect} />);

    // Clear initial fetch call
    mockFetchGraph.mockClear();

    // Test job-detail:view-in-graph event (nodeId without :)
    act(() => {
      document.dispatchEvent(
        new CustomEvent("job-detail:view-in-graph", {
          detail: { nodeId: "job123" },
        })
      );
    });
    expect(mockFetchGraph).toHaveBeenCalledWith("job", "job123", false, "both", true);

    mockFetchGraph.mockClear();
    // Test table-detail:view-in-graph event (nodeId with :)
    act(() => {
      document.dispatchEvent(
        new CustomEvent("table-detail:view-in-graph", {
          detail: { nodeId: "table:my_table" },
        })
      );
    });
    expect(mockFetchGraph).toHaveBeenCalledWith("table", "my_table", false, "both", true);

    // Switch to list view to see reload/export buttons
    const listBtn = screen.getByTitle("List View");
    fireEvent.click(listBtn);

    // Test ListView actions via ControlBar
    const reloadBtn = screen.getByTitle("Reload");
    fireEvent.click(reloadBtn);

    const exportListBtn = screen.getByTitle("Export CSV");
    fireEvent.click(exportListBtn);

    // Test selection in ListView mock
    fireEvent.click(screen.getByText("Select Table"));
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ type: "table", tableName: "db.schema.T1" })
    );

    fireEvent.click(screen.getByText("Select Job"));
    expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ type: "job", id: "j1" }));
  });

  it("should handle context menu actions with selected node", () => {
    const mockSelectNode = vi.fn();
    const mockRemoveNode = vi.fn();

    vi.mocked(useMermaidRenderer).mockReturnValue({
      ...vi.mocked(useMermaidRenderer)({} as any),
      selectedNode: { id: "n1", type: "table", name: "N1" } as any,
      contextMenu: {
        x: 100,
        y: 100,
        node: { id: "n1", type: "table", name: "N1" },
      },
      selectNode: mockSelectNode,
      setContextMenu: vi.fn(),
    } as any);

    vi.mocked(useGraphData).mockReturnValue({
      ...vi.mocked(useGraphData)({} as any),
      removeNode: mockRemoveNode,
    } as any);

    render(<App rootNode={{ type: "table", id: "n1" }} />);

    fireEvent.click(screen.getByLabelText("Show Details"));
    expect(mockSelectNode).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Delete Node"));
    expect(mockRemoveNode).toHaveBeenCalledWith("n1");

    fireEvent.click(screen.getByLabelText("Expand Upstream"));
    expect(mockFetchGraph).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Expand Downstream"));
    expect(mockFetchGraph).toHaveBeenCalled();
  });
});

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMermaidRenderer } from "../useMermaidRenderer";
import mermaid from "mermaid";
import * as d3 from "d3";
import { MermaidDslService } from "../../services/mermaidDslService";

// Mock dependencies
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

vi.mock("../../services/mermaidDslService", () => ({
  MermaidDslService: {
    generate: vi.fn(),
    sanitizeId: vi.fn((id) => id),
  },
}));

const mockOnInteractionStart = vi.fn();
vi.mock("../useD3Zoom", () => ({
  useD3Zoom: vi.fn(({ onInteractionStart }) => {
    // Save the handler to trigger later
    (useMermaidRenderer as any)._onInteractionStart = onInteractionStart;
    return {
      zoomLevel: 1,
      pan: { x: 0, y: 0 },
      fitToView: vi.fn(),
      resetView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomBehaviorRef: { current: { transform: vi.fn() } },
      setZoomLevel: vi.fn(),
      setPan: vi.fn(),
    };
  }),
}));

const mockGraphData = {
  nodes: [
    { id: "n1", type: "table", name: "Node 1" },
    {
      id: "g1",
      type: "group",
      name: "Group 1",
      properties: { direction: "upstream" },
    },
  ],
  edges: [],
};

describe("useMermaidRenderer", () => {
  let container: HTMLDivElement;
  let d3EventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    d3EventHandlers = {};

    let dslCounter = 0;
    (MermaidDslService.generate as any).mockImplementation(
      () => `flowchart LR\n  n1[Node ${++dslCounter}]`
    );

    (mermaid.render as any).mockResolvedValue({
      svg:
        '<svg id="mermaid-main-svg">' +
        '<g class="node" id="flowchart-n1"><rect></rect></g>' +
        '<g class="node" id="flowchart-g1"><rect></rect></g>' +
        "</svg>",
    });

    const mockD3Select = {
      selectAll: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      append: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      transition: vi.fn().mockReturnThis(),
      duration: vi.fn().mockReturnThis(),
      on: vi.fn(function (event, handler) {
        d3EventHandlers[event] = handler;
        return this;
      }),
    };
    (d3.select as any).mockReturnValue(mockD3Select);

    (d3 as any).zoomIdentity = {
      translate: vi.fn().mockReturnThis(),
      scale: vi.fn().mockReturnThis(),
      toString: vi.fn().mockReturnValue("translate(0,0) scale(1)"),
    };

    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 1000,
      height: 1000,
      top: 0,
      left: 0,
    });

    if (typeof SVGGElement !== "undefined") {
      SVGGElement.prototype.getBBox = vi.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    }

    container = document.createElement("div");
    container.id = "mermaid-container";
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentElement) document.body.removeChild(container);
  });

  it("should initialize and render graph with all interactions", async () => {
    const onSelect = vi.fn();
    const onSmartExpand = vi.fn();
    const onExpandGroup = vi.fn();

    const { result, rerender } = renderHook(
      ({ gData, orient, lay }) =>
        useMermaidRenderer({
          graphData: gData,
          orientation: orient as any,
          layout: lay as any,
          onSelect,
          onSmartExpand,
          onExpandGroup,
        }),
      {
        initialProps: { gData: mockGraphData, orient: "LR", lay: "dagre" },
      }
    );

    // Set ref
    Object.defineProperty(result.current.mermaidRef, "current", {
      value: container,
    });

    // Trigger DSL changed render
    await act(async () => {
      rerender({
        gData: { ...mockGraphData, nodes: [...mockGraphData.nodes] },
        orient: "LR",
        lay: "elk",
      });
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        flowchart: expect.objectContaining({ defaultRenderer: "elk" }),
      })
    );

    // 1. Test Node Interaction
    const nodeN1 = container.querySelector("#flowchart-n1");
    if (nodeN1) {
      act(() => {
        const ev = new MouseEvent("mousedown", { bubbles: true });
        nodeN1.dispatchEvent(ev);
      });
      expect(onSelect).toHaveBeenCalled();
      expect(result.current.selectedNode?.id).toBe("n1");

      // Test context menu deselect on interaction
      act(() => {
        (useMermaidRenderer as any)._onInteractionStart();
      });
      expect(result.current.contextMenu).toBeNull();

      // Double click
      act(() => {
        const ev = new MouseEvent("dblclick", { bubbles: true });
        nodeN1.dispatchEvent(ev);
      });
      expect(onSmartExpand).toHaveBeenCalled();
    }

    // 2. Test Group Interaction
    const nodeG1 = container.querySelector("#flowchart-g1");
    if (nodeG1) {
      act(() => {
        const ev = new MouseEvent("contextmenu", { bubbles: true });
        nodeG1.dispatchEvent(ev);
      });
      expect(onExpandGroup).toHaveBeenCalled();
    }

    // 3. Test selectNode(null)
    act(() => {
      result.current.selectNode(null);
    });
    expect(onSelect).toHaveBeenLastCalledWith(null);

    // 4. Test Background Interaction
    if (d3EventHandlers["click"]) {
      act(() => {
        d3EventHandlers["click"]({
          target: { tagName: "svg", id: "mermaid-main-svg" },
          stopPropagation: () => {},
        });
      });
      expect(result.current.selectedNode).toBeNull();
    }
  });

  it("should handle orientation change and SVG without inner G", async () => {
    // Mock SVG without inner G
    (mermaid.render as any).mockResolvedValue({
      svg: '<svg id="mermaid-main-svg"><rect id="node1"></rect></svg>',
    });

    const { result, rerender } = renderHook(
      ({ orient }) =>
        useMermaidRenderer({
          graphData: mockGraphData,
          orientation: orient as any,
          layout: "dagre",
        }),
      {
        initialProps: { orient: "LR" },
      }
    );

    Object.defineProperty(result.current.mermaidRef, "current", {
      value: container,
    });

    await act(async () => {
      rerender({ orient: "TB" });
      await new Promise((r) => setTimeout(r, 200));
    });

    // Check if inner-graph G was created
    expect(container.querySelector("g.mermaid-inner-graph")).not.toBeNull();
  });
});

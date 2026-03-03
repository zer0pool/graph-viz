import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGraphExport } from "../useGraphExport";
import React from "react";

describe("useGraphExport", () => {
  let mermaidRef: React.RefObject<HTMLDivElement>;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    mermaidRef = {
      current: document.createElement("div"),
    };

    // Mock getBBox on SVGGElement
    if (typeof SVGGElement !== "undefined") {
      SVGGElement.prototype.getBBox = vi.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    }

    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock XMLSerializer
    global.XMLSerializer = class {
      serializeToString = vi.fn().mockReturnValue("<svg>mock</svg>");
    } as any;

    originalCreateElement = document.createElement;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.createElement = originalCreateElement;
  });

  it("should return handleDownload", () => {
    const { result } = renderHook(() => useGraphExport(mermaidRef));
    expect(result.current.handleDownload).toBeDefined();
  });

  it("should do nothing if mermaidRef is null", () => {
    const { result } = renderHook(() => useGraphExport({ current: null }));
    act(() => {
      result.current.handleDownload();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("should do nothing if no svg is found", () => {
    const { result } = renderHook(() => useGraphExport(mermaidRef));
    act(() => {
      result.current.handleDownload();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("should trigger download if svg is found", () => {
    // Setup a more semi-realistic SVG structure
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("mermaid-inner-graph");
    svg.appendChild(g);

    // Add some paths
    const edgePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    g.appendChild(edgePath);

    const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeG.classList.add("node");
    const nodePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    nodeG.appendChild(nodePath);
    g.appendChild(nodeG);

    mermaidRef.current?.appendChild(svg);

    // Mock link element and click
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "a") return mockLink;
        return originalCreateElement.call(document, tagName);
      });

    // Mock document.body methods to avoid errors with mockLink
    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    const { result } = renderHook(() => useGraphExport(mermaidRef));

    act(() => {
      result.current.handleDownload();
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toContain("lineage_graph_full_");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    // Cleanup spies
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("should handle svg without inner graph elements", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mermaidRef.current?.appendChild(svg);

    // Mock URL methods to be safe
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();

    const { result } = renderHook(() => useGraphExport(mermaidRef));

    act(() => {
      result.current.handleDownload();
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});

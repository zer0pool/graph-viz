import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useD3Zoom } from "../useD3Zoom";
import * as d3 from "d3";

vi.mock("d3", async () => {
  const actual = await vi.importActual("d3");
  return {
    ...actual,
    select: vi.fn(),
    zoom: vi.fn(),
    zoomIdentity: {
      translate: vi.fn().mockReturnThis(),
      scale: vi.fn().mockReturnThis(),
      toString: vi.fn().mockReturnValue("translate(0,0) scale(1)"),
    },
  };
});

describe("useD3Zoom", () => {
  let mockZoom: any;
  let mockSelection: any;
  let eventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};

    mockZoom = {
      scaleExtent: vi.fn().mockReturnThis(),
      on: vi.fn(function (event: string, handler: Function) {
        eventHandlers[event] = handler;
        return this;
      }),
      transform: vi.fn(),
      scaleBy: vi.fn(),
    };
    (d3.zoom as any).mockReturnValue(mockZoom);

    mockSelection = {
      call: vi.fn(function (fn, ...args) {
        if (typeof fn === "function") {
          fn(this, ...args);
        }
        return this;
      }),
      on: vi.fn().mockReturnThis(),
      attr: vi.fn().mockReturnThis(),
      transition: vi.fn().mockReturnThis(),
      duration: vi.fn().mockReturnThis(),
    };
    (d3.select as any).mockReturnValue(mockSelection);

    // Global mock for getBBox and getBoundingClientRect
    if (typeof SVGGElement !== "undefined") {
      SVGGElement.prototype.getBBox = vi
        .fn()
        .mockReturnValue({ x: 0, y: 0, width: 500, height: 500 });
    }
    Element.prototype.getBoundingClientRect = vi
      .fn()
      .mockReturnValue({ width: 1000, height: 1000, top: 0, left: 0 });
  });

  it("should initialize zoom behavior", () => {
    const mermaidRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useD3Zoom({ mermaidRef }));

    expect(d3.zoom).toHaveBeenCalled();
    expect(mockZoom.scaleExtent).toHaveBeenCalledWith([0.1, 5]);
    expect(result.current.zoomLevel).toBe(1);
  });

  it("should setup listeners on svg", () => {
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    container.appendChild(svg);
    const mermaidRef = { current: container };

    renderHook(() => useD3Zoom({ mermaidRef }));
    expect(d3.select).toHaveBeenCalled();
  });

  it("should handle zoom events", () => {
    const onInteractionStart = vi.fn();
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const innerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(innerG);
    container.appendChild(svg);
    const mermaidRef = { current: container };

    const { result } = renderHook(() =>
      useD3Zoom({ mermaidRef, onInteractionStart }),
    );

    if (eventHandlers["zoom"]) {
      act(() => {
        eventHandlers["zoom"]({
          transform: {
            k: 1.5,
            x: 100,
            y: 100,
            toString: () => "translate(100,100) scale(1.5)",
          },
        });
      });

      expect(onInteractionStart).toHaveBeenCalled();
      expect(result.current.zoomLevel).toBe(1.5);
      expect(result.current.pan).toEqual({ x: 100, y: 100 });
    }
  });

  it("should provide controls like zoomIn, zoomOut, reset", () => {
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const innerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(innerG);
    container.appendChild(svg);
    const mermaidRef = { current: container };

    const { result } = renderHook(() => useD3Zoom({ mermaidRef }));

    act(() => {
      result.current.zoomIn();
    });
    expect(mockSelection.transition).toHaveBeenCalled();

    act(() => {
      result.current.zoomOut();
    });
    expect(mockSelection.transition).toHaveBeenCalled();

    act(() => {
      result.current.resetView();
    });
    expect(mockSelection.transition).toHaveBeenCalled();
  });

  it("should handle fitToView", () => {
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const innerG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(innerG);
    container.appendChild(svg);
    const mermaidRef = { current: container };

    const { result } = renderHook(() => useD3Zoom({ mermaidRef }));

    act(() => {
      result.current.fitToView();
    });

    expect(mockSelection.call).toHaveBeenCalled();
  });

  it("should handle start and end events", () => {
    const onInteractionStart = vi.fn();
    const onInteractionEnd = vi.fn();
    const container = document.createElement("div");
    const mermaidRef = { current: container };

    renderHook(() =>
      useD3Zoom({ mermaidRef, onInteractionStart, onInteractionEnd }),
    );

    if (eventHandlers["start"]) {
      act(() => {
        eventHandlers["start"]();
      });
      expect(onInteractionStart).toHaveBeenCalled();
      expect(container.classList.contains("grabbing")).toBe(true);
    }

    if (eventHandlers["end"]) {
      act(() => {
        eventHandlers["end"]();
      });
      expect(onInteractionEnd).toHaveBeenCalled();
      expect(container.classList.contains("grabbing")).toBe(false);
    }
  });
});

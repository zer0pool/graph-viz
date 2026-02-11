import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ControlBar } from "../ControlBar";
import React from "react";

describe("ControlBar", () => {
  const mockHandlers = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    onFit: vi.fn(),
    onRotate: vi.fn(),
    onDownloadSVG: vi.fn(),
    onCopyMermaid: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onExpandUpstream: vi.fn(),
    onExpandDownstream: vi.fn(),
    onSmartExpand: vi.fn(),
    onViewModeChange: vi.fn(),
    onLayoutChange: vi.fn(),
  };

  const defaultProps = {
    ...mockHandlers,
    zoomLevel: 100,
    orientation: "LR" as const,
    canUndo: false,
    canRedo: false,
    viewMode: "graph" as const,
    layout: "dagre" as const,
    isNodeSelected: false,
  };

  it("should render graph controls when viewMode is 'graph'", () => {
    render(<ControlBar {...defaultProps} />);
    // Check for some graph-specific components or text (tooltips)
    // HistoryControls, ZoomControls, etc.
    expect(screen.getByTitle("Zoom In")).toBeInTheDocument();
    expect(screen.getByTitle("Undo")).toBeInTheDocument();
  });

  it("should render list controls when viewMode is 'list'", () => {
    render(<ControlBar {...defaultProps} viewMode="list" />);
    expect(screen.getByTitle("Reload")).toBeInTheDocument();
    expect(screen.getByTitle("Export CSV")).toBeInTheDocument();
  });

  it("should call onZoomIn when zoom in clicked", () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Zoom In"));
    expect(mockHandlers.onZoomIn).toHaveBeenCalled();
  });

  it("should disable expansion controls when no node is selected", () => {
    render(<ControlBar {...defaultProps} isNodeSelected={false} />);
    const expandBtn = screen.getByTitle("Smart Expand");
    expect(expandBtn).toBeDisabled();
  });

  it("should enable expansion controls when node is selected", () => {
    render(<ControlBar {...defaultProps} isNodeSelected={true} />);
    const expandBtn = screen.getByTitle("Smart Expand");
    expect(expandBtn).not.toBeDisabled();
  });
});

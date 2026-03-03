import React, { forwardRef } from "react";

interface GraphCanvasProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
}

export const GraphCanvas = forwardRef<HTMLDivElement, GraphCanvasProps>(
  ({ loading, error, isEmpty }, ref) => {
    return (
      <div
        className="graph-canvas-root"
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        {/* Mermaid Mount Point - React never touches children here */}
        <div
          id="mermaid-container"
          ref={ref}
          className="mermaid-container"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Overlays - Absolute Positioning */}
        {loading && (
          <div className="loading-overlay" style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <div className="loading-spinner" />
          </div>
        )}
        {error && (
          <div className="error-message" style={{ position: "absolute", inset: 0, zIndex: 10 }}>
            <p>Error loading graph: {error}</p>
          </div>
        )}
      </div>
    );
  }
);

GraphCanvas.displayName = "GraphCanvas";

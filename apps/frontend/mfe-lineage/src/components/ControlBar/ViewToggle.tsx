import React from "react";

export type ViewMode = "graph" | "list";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="view-toggle" role="tablist" aria-label="View mode">
      <button
        className={`view-tab ${mode === "graph" ? "active" : ""}`}
        type="button"
        role="tab"
        aria-selected={mode === "graph"}
        onClick={() => onChange("graph")}
        title="Graph View"
      >
        Graph
      </button>
      <button
        className={`view-tab ${mode === "list" ? "active" : ""}`}
        type="button"
        role="tab"
        aria-selected={mode === "list"}
        onClick={() => onChange("list")}
        title="List View"
      >
        List
      </button>
    </div>
  );
};

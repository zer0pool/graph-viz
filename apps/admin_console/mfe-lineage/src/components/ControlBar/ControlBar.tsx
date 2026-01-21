import React from "react";
import { ZoomControls } from "./ZoomControls";
import { HistoryControls } from "./HistoryControls";
import { ExpandControls } from "./ExpandControls";
import { DownloadControls } from "./DownloadControls";
import { ViewToggle, ViewMode } from "./ViewToggle";
import { OrientationControls } from "./OrientationControls";
import { LayoutControls, LayoutType } from "./LayoutControls";
import { LayoutOrientation } from "../../types/graph";

interface ControlBarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  onRotate: (orientation: LayoutOrientation) => void;
  onDownloadSVG: () => void;
  onCopyMermaid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExpandUpstream: () => void;
  onExpandDownstream: () => void;
  onSmartExpand: () => void;
  zoomLevel: number;
  orientation: LayoutOrientation;
  canUndo: boolean;
  canRedo: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  isNodeSelected: boolean;
  // List Actions
  onListReload?: () => void;
  onListExport?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  onRotate,
  onDownloadSVG,
  onCopyMermaid,
  onUndo,
  onRedo,
  onExpandUpstream,
  onExpandDownstream,
  onSmartExpand,
  zoomLevel,
  orientation,
  canUndo,
  canRedo,
  viewMode,
  onViewModeChange,
  layout,
  onLayoutChange,
  isNodeSelected,
  onListReload,
  onListExport,
}) => {
  return (
    <div className="graph-control-bar toolbar-shell">
      {/* Group 1: View Toggle */}
      <div className="control-group">
        <ViewToggle mode={viewMode} onChange={onViewModeChange} />
      </div>

      <span className="toolbar-divider"></span>

      {viewMode === "graph" ? (
        <>
          {/* Group 2: Export */}
          <div className="control-group">
            <DownloadControls
              onDownloadSVG={onDownloadSVG}
              onCopyMermaid={onCopyMermaid}
            />
          </div>

          <span className="toolbar-divider"></span>

          {/* Group 3: Orientation & Layout */}
          <div className="control-group">
            <OrientationControls
              orientation={orientation}
              onChange={onRotate}
            />
            <LayoutControls layout={layout} onChange={onLayoutChange} />
          </div>

          <span className="toolbar-divider"></span>

          {/* Group 4: Zoom */}
          <div className="control-group">
            <ZoomControls
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onReset={onReset}
              onFit={onFit}
              zoomLevel={zoomLevel}
            />
          </div>

          <span className="toolbar-divider"></span>

          {/* Group 5: History */}
          <div className="control-group">
            <HistoryControls
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          <span className="toolbar-divider"></span>

          {/* Group 6: Expand Controls */}
          <div className="control-group">
            <ExpandControls
              onExpandUpstream={onExpandUpstream}
              onExpandDownstream={onExpandDownstream}
              onSmartExpand={onSmartExpand}
              disabled={!isNodeSelected}
            />
          </div>
        </>
      ) : (
        <>
          {/* Group 2: List Actions */}
          <div className="control-group">
            <button
              className="control-btn"
              onClick={onListReload}
              data-tooltip="Reload"
              title="Reload"
            >
              <svg
                className="icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1485 17.5626 17.75M20 12C20 7.58172 16.4183 4.00002 12 4.00002C9.84982 4.00002 7.89777 4.85153 6.43739 6.25002M6.43739 6.25002V2.50002M6.43739 6.25002H10.1874"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="control-btn"
              onClick={onListExport}
              data-tooltip="Export CSV"
              title="Export CSV"
            >
              <svg
                className="icon-svg"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 16V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V16M12 16V4M12 16L8 12M12 16L16 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

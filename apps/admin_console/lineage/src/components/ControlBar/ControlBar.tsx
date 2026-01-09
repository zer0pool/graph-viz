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
}) => {
  return (
    <div className="graph-control-bar toolbar-shell">
      {/* Group 1: View Toggle */}
      <div className="control-group">
        <ViewToggle mode={viewMode} onChange={onViewModeChange} />
      </div>

      <span className="toolbar-divider"></span>

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
        <OrientationControls orientation={orientation} onChange={onRotate} />
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
    </div>
  );
};

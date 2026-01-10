import React from "react";
import {
  ZoomInIcon,
  ZoomOutIcon,
  ResetIcon,
  MaximizeIcon,
} from "../../assets/icons";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  zoomLevel: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  zoomLevel,
}) => {
  return (
    <div className="control-group">
      <button
        className="control-btn"
        onClick={onFit}
        data-tooltip="Fit to View"
      >
        <MaximizeIcon />
      </button>
      <button className="control-btn" onClick={onZoomIn} data-tooltip="Zoom In">
        <ZoomInIcon />
      </button>
      <button
        className="control-btn"
        onClick={onZoomOut}
        data-tooltip="Zoom Out"
      >
        <ZoomOutIcon />
      </button>
      <span className="zoom-display">{Math.round(zoomLevel * 100)}%</span>
      <button
        className="control-btn"
        onClick={onReset}
        data-tooltip="Reset Graph"
      >
        <ResetIcon />
      </button>
    </div>
  );
};

import React from "react";
import {
  ExpandUpIcon,
  ExpandDownIcon,
  SmartExpandIcon,
} from "../../assets/icons";

interface ExpandControlsProps {
  onExpandUpstream: () => void;
  onExpandDownstream: () => void;
  onSmartExpand: () => void;
  disabled?: boolean;
}

export const ExpandControls: React.FC<ExpandControlsProps> = ({
  onExpandUpstream,
  onExpandDownstream,
  onSmartExpand,
  disabled = false,
}) => {
  return (
    <div className="button-group">
      <button
        className="control-btn"
        onClick={onExpandUpstream}
        disabled={disabled}
        data-tooltip="Expand Upstream"
      >
        <ExpandUpIcon />
      </button>

      <button
        className="control-btn smart-expand-btn"
        onClick={onSmartExpand}
        disabled={disabled}
        data-tooltip="Smart Expand"
      >
        <span className="btn-text">EXPAND</span>
        <SmartExpandIcon />
      </button>

      <button
        className="control-btn"
        onClick={onExpandDownstream}
        disabled={disabled}
        data-tooltip="Expand Downstream"
      >
        <ExpandDownIcon />
      </button>
    </div>
  );
};

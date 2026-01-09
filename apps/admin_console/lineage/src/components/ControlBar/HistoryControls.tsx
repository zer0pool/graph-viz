import React from "react";
import { UndoIcon, RedoIcon } from "../../assets/icons";

interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const HistoryControls: React.FC<HistoryControlsProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="control-group">
      <button
        className="control-btn"
        onClick={onUndo}
        disabled={!canUndo}
        data-tooltip="Undo"
      >
        <UndoIcon />
      </button>
      <button
        className="control-btn"
        onClick={onRedo}
        disabled={!canRedo}
        data-tooltip="Redo"
      >
        <RedoIcon />
      </button>
    </div>
  );
};

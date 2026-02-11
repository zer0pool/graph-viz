import {
  ExpandUpIcon,
  ExpandDownIcon,
  DetailIcon,
  TrashIcon,
} from "../assets/icons";
import { ContextMenuState } from "../types/graph";

interface ContextMenuProps {
  state: ContextMenuState | null;
  onClose: () => void;
  onExpandUpstream: () => void;
  onExpandDownstream: () => void;
  onShowDetails: () => void;
  onDelete: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onExpandUpstream,
  onExpandDownstream,
  onShowDetails,
  onDelete,
}) => {
  if (!state) return null;

  return (
    <div
      className="floating-context-menu"
      style={{ left: state.x, top: state.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <button
          className="ctx-btn"
          data-tooltip="Expand Upstream"
          aria-label="Expand Upstream"
          onClick={() => {
            onExpandUpstream();
            onClose();
          }}
        >
          <ExpandUpIcon />
        </button>
        <button
          className="ctx-btn"
          data-tooltip="Expand Downstream"
          aria-label="Expand Downstream"
          onClick={() => {
            onExpandDownstream();
            onClose();
          }}
        >
          <ExpandDownIcon />
        </button>
      </div>
      <div className="ctx-divider" />
      <button
        className="ctx-btn"
        data-tooltip="Show Details"
        aria-label="Show Details"
        onClick={() => {
          onShowDetails();
          onClose();
        }}
      >
        <DetailIcon />
      </button>
      <button
        className="ctx-btn danger"
        data-tooltip="Delete Node"
        aria-label="Delete Node"
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

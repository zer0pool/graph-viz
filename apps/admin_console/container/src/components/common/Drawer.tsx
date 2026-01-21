import React from "react";
import "../../styles/components/common/Drawer.css";

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-content">
        <div className="drawer-header">
          <strong>Details</strong>
          <button className="drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
};

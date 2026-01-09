import React from "react";

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.1)",
          zIndex: 999,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: "#fff",
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            height: 48,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
          }}
        >
          <strong>Details</strong>
          <button onClick={onClose} style={{ cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <div style={{ overflow: "auto", height: "calc(100% - 48px)" }}>
          {children}
        </div>
      </div>
    </>
  );
};

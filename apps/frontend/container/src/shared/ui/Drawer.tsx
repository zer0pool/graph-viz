import React, { useState, useEffect, useRef } from "react";
import "../../styles/components/common/Drawer.css";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  if (!open) return null;

  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
        const maxWidth = document.body.clientWidth / 2;
        if (newWidth > 420 && newWidth < maxWidth) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div
        className="drawer-content"
        style={{ width: width, transition: isResizing ? "none" : "width 0.2s ease" }}
        ref={sidebarRef}
      >
        <div
          className={`drawer-resizer ${isResizing ? "resizing" : ""}`}
          onMouseDown={startResizing}
          style={{
            position: "absolute",
            left: "-2px",
            top: 0,
            bottom: 0,
            width: "4px",
            cursor: "ew-resize",
            zIndex: 1001,
            backgroundColor: isResizing ? "#1a73e8" : "transparent",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isResizing) e.currentTarget.style.backgroundColor = "rgba(26, 115, 232, 0.3)";
          }}
          onMouseLeave={(e) => {
            if (!isResizing) e.currentTarget.style.backgroundColor = "transparent";
          }}
        />
        {/* dbt style: Integrated close button in CompactDetailLayout would be better, but let's just make this header consistent */}
        <div className="flex justify-end p-2 border-b border-[#e5e7eb]">
          <button
            className="p-2 text-[#6b7280] hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">{children}</div>
      </div>
    </>
  );
}

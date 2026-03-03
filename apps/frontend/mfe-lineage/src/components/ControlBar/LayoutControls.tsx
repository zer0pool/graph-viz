import React, { useState, useRef, useEffect } from "react";
import { LayoutIcon, CheckIcon } from "../../assets/icons";

export type LayoutType = "dagre" | "elk";

interface LayoutControlsProps {
  layout: LayoutType;
  onChange: (layout: LayoutType) => void;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({ layout, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, {
      capture: true,
    });
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
  }, []);

  return (
    <div className="toolbar-dropdown-wrapper" ref={containerRef}>
      <button
        className={`simple-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        data-tooltip="Change Layout"
      >
        <span className="btn-icon">
          <LayoutIcon />
        </span>
      </button>

      {isOpen && (
        <div className="layout-popup">
          <div className="layout-header">
            <p>Layout</p>
          </div>
          <div className="layout-list">
            <button
              className={`layout-item ${layout === "dagre" ? "active" : ""}`}
              onClick={() => {
                onChange("dagre");
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <LayoutIcon />
                  </div>
                  <span>Hierarchical</span>
                </div>
                {layout === "dagre" && <CheckIcon />}
              </div>
            </button>
            <button
              className={`layout-item ${layout === "elk" ? "active" : ""}`}
              onClick={() => {
                onChange("elk");
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <LayoutIcon />
                  </div>
                  <span>Adaptive</span>
                </div>
                {layout === "elk" && <CheckIcon />}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

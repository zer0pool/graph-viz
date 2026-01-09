import React, { useState, useRef, useEffect } from "react";
import { OrientationIcon, LRIcon, TBIcon, CheckIcon } from "../../assets/icons";
import { LayoutOrientation } from "../../types/graph";

interface OrientationControlsProps {
  orientation: LayoutOrientation;
  onChange: (orientation: LayoutOrientation) => void;
}

export const OrientationControls: React.FC<OrientationControlsProps> = ({
  orientation,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
        data-tooltip="Change Direction"
      >
        <span className="btn-icon">
          <OrientationIcon />
        </span>
      </button>

      {isOpen && (
        <div className="layout-popup">
          <div className="layout-header">
            <p>Direction</p>
          </div>
          <div className="layout-list">
            <button
              className={`layout-item ${orientation === "LR" ? "active" : ""}`}
              onClick={() => {
                onChange("LR");
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <LRIcon />
                  </div>
                  <span>Left to right</span>
                </div>
                {orientation === "LR" && <CheckIcon />}
              </div>
            </button>
            <button
              className={`layout-item ${orientation === "TB" ? "active" : ""}`}
              onClick={() => {
                onChange("TB");
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <TBIcon />
                  </div>
                  <span>Top to bottom</span>
                </div>
                {orientation === "TB" && <CheckIcon />}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

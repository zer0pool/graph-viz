import React, { useState, useRef, useEffect } from "react";
import { DownloadIcon, CheckIcon } from "../../assets/icons";

interface DownloadControlsProps {
  onDownloadSVG: () => void;
  onCopyMermaid: () => void;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  onDownloadSVG,
  onCopyMermaid,
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
        data-tooltip="Export Graph"
      >
        <span className="btn-icon">
          <DownloadIcon />
        </span>
      </button>

      {isOpen && (
        <div className="layout-popup">
          <div className="layout-header">
            <p>Export</p>
          </div>
          <div className="layout-list">
            <button
              className="layout-item"
              onClick={() => {
                onDownloadSVG();
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <DownloadIcon />
                  </div>
                  <span>Download SVG</span>
                </div>
              </div>
            </button>
            <button
              className="layout-item"
              onClick={() => {
                onCopyMermaid();
                setIsOpen(false);
              }}
            >
              <div className="layout-item-content">
                <div className="layout-item-left">
                  <div className="menu-icon-wrapper">
                    <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                      M
                    </span>
                  </div>
                  <span>Copy Mermaid</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

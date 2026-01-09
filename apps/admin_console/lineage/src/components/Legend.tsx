import React from "react";

export const Legend: React.FC = () => {
  return (
    <div id="graph-legend" className="floating-panel graph-legend">
      <div className="legend-item">
        <span className="legend-color legend-job"></span>
        <span>Job</span>
      </div>
      <div className="legend-item">
        <span className="legend-color legend-table"></span>
        <span>Table</span>
      </div>
    </div>
  );
};

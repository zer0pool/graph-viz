import React from "react";

interface StatusBarProps {
  loading: boolean;
  error: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ loading, error }) => {
  if (!loading && !error) return null;

  return (
    <div id="graph-status" className="floating-panel graph-status">
      <span id="graph-status-text">{loading ? "Loading..." : error ? `Error: ${error}` : ""}</span>
    </div>
  );
};

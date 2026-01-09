import React, { useState } from "react";
import App from "./App";
import { Selection } from "./types/graph";

/**
 * StandaloneApp
 *
 * This component is only used for standalone development and verification (localhost:3001).
 * It provides a default root node and logs selection events to the console.
 */
export const StandaloneApp: React.FC = () => {
  // Default to a known job/table for testing when starting standalone
  const [rootNode] = useState<Selection>({
    type: "job",
    id: "L2_JOB_005",
  });

  const handleSelect = (selection: Selection | null) => {
    console.log("[Standalone] Selection changed:", selection);

    // In a real standalone app, we might update URL or local state
    // but here we just log to satisfy the checklist "console.log(selection)"
    // console.log already handles the request for MFE debugging
    // Alert removed as requested
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "8px 16px",
          background: "#1a73e8",
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Lineage MFE - Standalone Mode</span>
        <span style={{ fontSize: "12px", opacity: 0.8 }}>localhost:3001</span>
      </header>
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <App rootNode={rootNode} onSelect={handleSelect} />
      </main>
    </div>
  );
};

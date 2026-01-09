import React, { useState } from "react";
import { RemoteMount } from "../mfe/RemoteMount";

/**
 * 🟡 Step 3. “가짜 Shell” (Mini Shell)
 * 목적: Lineage MFE (이벤트) → MiniShell (상태) → Detail MFE (뷰) 흐름 검증
 */
export const MiniShell = () => {
  const [selection, setSelection] = useState<any>(null);

  return (
    <div style={{ display: "flex", height: "100vh", padding: 20, gap: 20 }}>
      {/* 1. Lineage MFE */}
      <div
        style={{
          flex: 2,
          border: "2px solid #1a73e8",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <h4
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            margin: 0,
            background: "#fff",
            zIndex: 100,
          }}
        >
          Lineage MFE
        </h4>
        <RemoteMount
          scope="lineage"
          module="./index"
          url="http://localhost:3001/remoteEntry.js"
          mountProps={{
            onSelect: (event: any) => {
              console.log("[MiniShell] Selected:", event);
              setSelection(event);
            },
            rootNode: { type: "job", id: "EXTRA_JOB_151" }, // Test Root
          }}
          visible={true}
        />
      </div>

      {/* 2. Detail MFE */}
      <div
        style={{
          flex: 1,
          border: "2px solid #34a853",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <h4
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            margin: 0,
            background: "#fff",
            zIndex: 100,
          }}
        >
          Detail MFE
        </h4>
        {selection ? (
          <RemoteMount
            scope="tableDetailViewer"
            module="./index"
            url="http://localhost:3002/remoteEntry.js"
            mountProps={selection}
            visible={true}
          />
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            Click a node in the graph to see details here.
          </div>
        )}
      </div>
    </div>
  );
};

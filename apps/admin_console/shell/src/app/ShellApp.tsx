import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AuthProvider } from "./AuthContext";
import { AppRouter } from "./Router";
import { Drawer } from "../layout/Drawer";
import { RemoteMount } from "../mfe/RemoteMount";

type DrawerState = null | {
  type: "table" | "job";
  tableName?: string;
  jobId?: string;
};

export const ShellApp = () => {
  // 🟢 Step 4: 진짜 Shell에 재결합
  const [activeGraphNode, setActiveGraphNode] = useState<any>(null); // 검색 선정 노드
  const [selection, setSelection] = useState<any>(null); // 그래프 클릭 노드

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout onSelectGraphNode={setActiveGraphNode}>
          <AppRouter
            onSelectNode={(event) => {
              console.log("[Shell] Node selected in graph:", event);
              setSelection(event); // Connector: Lineage -> Drawer
            }}
            activeGraphNode={activeGraphNode}
          />
        </AppLayout>

        {/* Connector: selection -> Detail MFE */}
        <Drawer open={!!selection} onClose={() => setSelection(null)}>
          <RemoteMount
            scope="tableDetailViewer"
            module="./index"
            url="http://localhost:3002/remoteEntry.js"
            mountProps={selection}
            visible={!!selection}
          />
        </Drawer>
      </BrowserRouter>
    </AuthProvider>
  );
};

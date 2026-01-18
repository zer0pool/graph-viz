import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AuthProvider } from "./AuthContext";
import { AppRouter } from "./Router";
import { Drawer } from "../components/common/Drawer";
import { RemoteMount } from "../mfe/RemoteMount";
import { config } from "../config";
import "../styles/global.css";
import "../styles/tailwind.css";

type DrawerState = null | {
  type: "table" | "job";
  tableName?: string;
  jobId?: string;
};

export const ShellApp = () => {
  // 🟢 Step 4: 진짜 Shell에 재결합
  const [activeGraphNode, setActiveGraphNode] = useState<any>(null); // 검색 선정 노드
  const [selection, setSelection] = useState<any>(null); // 그래프 클릭 노드
  const [drawerOpen, setDrawerOpen] = useState(false); // Drawer 열림 상태

  console.log("[Shell] Current activeGraphNode:", activeGraphNode);

  const handleNodeSelection = React.useCallback((event: any) => {
    console.log("[Shell] Node selected in graph:", event);
    if (!event) {
      setSelection(null);
      setDrawerOpen(false);
    } else {
      setSelection(event); // ALWAYS update selection for propagation
      if (event.action === "showDetail") {
        setDrawerOpen(true); // ONLY open drawer on icon click
      }
    }
  }, []);

  return (
    <BrowserRouter basename={config.BASE_URL}>
      <AppLayout
        onSelectGraphNode={(node) => {
          console.log("[Shell] Setting activeGraphNode:", node);
          setActiveGraphNode(node);
        }}
      >
        <AppRouter
          onSelectNode={handleNodeSelection}
          activeGraphNode={activeGraphNode}
          selection={selection} // PROPAGATE selection
        />
      </AppLayout>

      {/* Connector: selection -> Detail MFE */}
      {config.ENABLE_TABLE_DETAIL_MFE && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <RemoteMount
            scope="tableDetailViewer"
            module="./index"
            url={config.TABLE_DETAIL_MFE_URL}
            mountProps={selection}
            visible={drawerOpen}
          />
        </Drawer>
      )}
    </BrowserRouter>
  );
};

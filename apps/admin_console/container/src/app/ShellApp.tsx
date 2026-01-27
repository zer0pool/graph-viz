import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AuthProvider } from "./AuthContext";
import { AppRouter } from "./Router";
import { Drawer } from "../components/common/Drawer";
import { RemoteMount } from "../mfe/RemoteMount";
import { config } from "../config";
import { useNavigate, useLocation } from "react-router-dom";
import { useTracker } from "../hooks/useTracker";
import "../styles/global.css";
import "../styles/tailwind.css";

const MFE_NAVIGATE_EVENT = "mfe:navigate"; // Consistent with MFE side

// 🔹 Navigation Sync Component: Listens for MFE events and updates Shell router
const GlobalNavSync = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  React.useEffect(() => {
    const handleMfeNavigate = (e: any) => {
      const { path } = e.detail;
      if (path && path !== pathname) {
        console.log(
          `[Shell:NavSync] Syncing Shell route: ${pathname} -> ${path}`,
        );
        navigate(path);
      }
    };

    window.addEventListener(MFE_NAVIGATE_EVENT, handleMfeNavigate);
    return () =>
      window.removeEventListener(MFE_NAVIGATE_EVENT, handleMfeNavigate);
  }, [navigate, pathname]);

  return null;
};

// 🔹 Visit Tracker Component: Must be inside BrowserRouter
const VisitTracker = () => {
  useTracker();
  return null;
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
      <GlobalNavSync />
      <VisitTracker />
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
      {config.ENABLE_MFE_CATALOG && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <RemoteMount
            scope="tableDetailViewer"
            module="./index"
            url={config.CATALOG_MFE_URL}
            mountProps={selection}
            visible={drawerOpen}
          />
        </Drawer>
      )}
    </BrowserRouter>
  );
};

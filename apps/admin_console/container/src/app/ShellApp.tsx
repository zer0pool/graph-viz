import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayoutWidget } from "../widgets/app-layout/AppLayoutWidget";
import { AuthProvider } from "./providers/AuthProvider";
import { AppRouter } from "./router/Router";
import { ErrorBoundary } from "../shared/ui/ErrorBoundary";
import { Drawer } from "../shared/ui/Drawer";
import { RemoteMount } from "../features/mfe-loader/RemoteMount";
import { config } from '../shared/api/config';
import { useNavigate, useLocation } from "react-router-dom";
import { useTracker } from "../shared/lib/hooks/useTracker";
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

export function ShellApp() {

  // 🟢 Step 4: Reintegration into the real Shell
  const [activeGraphNode, setActiveGraphNode] = useState<any>(null); // Selected node from search
  const [selection, setSelection] = useState<any>(null); // Node clicked on the graph
  const [drawerOpen, setDrawerOpen] = useState(false); // Drawer open state

  React.useEffect(() => {
    console.log("[ShellApp] State Update - activeGraphNode:", activeGraphNode);
  }, [activeGraphNode]);

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
      <ErrorBoundary>
        <AppLayoutWidget
          onSelectGraphNode={(node) => {
            console.log("[Shell] Setting activeGraphNode:", node);
            setActiveGraphNode(node);
          }}
        >
          <AppRouter
            onSelectNode={handleNodeSelection}
            activeGraphNode={activeGraphNode}
            onSetRootNode={setActiveGraphNode}
            selection={selection} // PROPAGATE selection
          />
        </AppLayoutWidget>

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
      </ErrorBoundary>
    </BrowserRouter>
  );
};

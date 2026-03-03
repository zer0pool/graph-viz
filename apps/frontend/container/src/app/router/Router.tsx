import React, { useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { RemoteMount } from "../../features/mfe-loader/RemoteMount";
import { config } from "../../shared/api/config";
import "../../styles/app/Router.css";

const LineageRouteWrapper: React.FC<{
  onSelectNode: (event: any) => void;
  activeGraphNode: any;
  onSetRootNode: (node: any) => void;
  selection?: any;
}> = ({ onSelectNode, activeGraphNode, onSetRootNode, selection }) => {
  const params = useParams();
  const rest = params["*"];

  // 🔹 Extract requested node from URL synchronously for initial mount
  const requestedNode = React.useMemo(() => {
    if (!rest) return null;
    const decoded = decodeURIComponent(rest);
    let type = "table";
    let id = decoded;
    if (decoded.includes(":")) {
      const parts = decoded.split(":");
      type = parts[0];
      id = parts[1];
    }
    return { type, id };
  }, [rest]);

  useEffect(() => {
    console.log("[Shell:LineageWrapper] rest param changed:", rest);
    if (requestedNode) {
      console.log(
        "[Shell:LineageWrapper] Parsed entity from URL:",
        requestedNode,
        "Current active:",
        activeGraphNode
      );

      // Sync activeGraphNode state if it doesn't match the URL (but don't wait for it for render)
      if (
        !activeGraphNode ||
        activeGraphNode.id !== requestedNode.id ||
        activeGraphNode.type !== requestedNode.type
      ) {
        console.log(
          "[Shell:LineageWrapper] Syncing Shell activeGraphNode state to match URL:",
          requestedNode.id
        );
        onSetRootNode(requestedNode);
      }
    }
  }, [requestedNode, activeGraphNode, onSetRootNode, rest]);

  // 🔹 Priority: Current URL (requestedNode) > Global State (activeGraphNode)
  // This prevents mounting with 'null' while state is updating
  const effectiveRootNode = requestedNode || activeGraphNode;

  return (
    <RemoteMount
      key="lineage-main"
      scope="lineage"
      module="./index"
      url={config.LINEAGE_MFE_URL}
      mountProps={{
        onSelect: onSelectNode,
        rootNode: effectiveRootNode,
        initialSelection: selection,
        path: rest,
      }}
      visible={true}
    />
  );
};

const CatalogRouteWrapper: React.FC<{ domain: string }> = ({ domain }) => {
  const params = useParams();
  const rest = params["*"];
  const location = require("react-router-dom").useLocation();

  return (
    <RemoteMount
      key={`catalog-${domain}-${rest?.split("/")[0] || "landing"}`}
      scope="tableDetailViewer"
      module="./views"
      url={config.CATALOG_MFE_URL}
      mountProps={{
        mode: "STANDALONE",
        domain,
        id: rest?.split("/")[0],
        path: location.pathname,
      }}
      visible={true}
    />
  );
};

const Diagnostics: React.FC = () => (
  <div className="diagnostics-container">
    <h1>Shell Diagnostics</h1>
    <pre>{JSON.stringify(config, null, 2)}</pre>
    <hr />
    <h3>Window Config</h3>
    <pre>{JSON.stringify((window as any).__APP_CONFIG__, null, 2)}</pre>
  </div>
);

import { AuditPage } from "../../pages/audit/AuditPage";
import { UsersPage } from "../../pages/users/UsersPage";
import { UserDetailPage } from "../../pages/users/UserDetailPage";
import { DashboardPage } from "../../pages/dashboard/DashboardPage";

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold">{title} Page</h1>
    <p className="mt-4 text-gray-500">Coming soon...</p>
  </div>
);

export const AppRouter: React.FC<{
  onSelectNode: (event: any) => void;
  activeGraphNode: any;
  onSetRootNode: (node: any) => void;
  selection?: any;
}> = ({ onSelectNode, activeGraphNode, onSetRootNode, selection }) => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/diag" element={<Diagnostics />} />
      {/* Lineage MFE */}
      {/* @ts-ignore */}
      {config.ENABLE_MFE_LINEAGE && (
        <Route
          path="/lineage/*"
          element={
            <LineageRouteWrapper
              onSelectNode={onSelectNode}
              activeGraphNode={activeGraphNode}
              onSetRootNode={onSetRootNode}
              selection={selection}
            />
          }
        />
      )}

      {/* Table/Job Detail Viewer MFE - Landing & Detail */}
      {/* @ts-ignore */}
      {config.ENABLE_MFE_CATALOG && (
        <>
          {/* Catalog MFE: Handles Jobs, Tables, and Projects */}
          {["jobs", "tables", "projects"].map((domain) => (
            <Route
              key={`catalog-${domain}`}
              path={`/${domain}/*`}
              element={<CatalogRouteWrapper domain={domain} />}
            />
          ))}
        </>
      )}

      {/* Shell Managed Landing Pages */}
      <Route path="/users" element={<UsersPage />} />
      <Route path="/users/:userId" element={<UserDetailPage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/settings" element={<Placeholder title="Settings" />} />
    </Routes>
  );
};

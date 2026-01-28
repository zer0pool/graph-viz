import React, { useEffect } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { RemoteMount } from "../mfe/RemoteMount";
import { AuthCallback } from "./AuthCallback";
import { config } from "../config";
import "../styles/app/Router.css";

const LineageRouteWrapper: React.FC<{
  onSelectNode: (event: any) => void;
  activeGraphNode: any;
  onSetRootNode: (node: any) => void;
  selection?: any;
}> = ({ onSelectNode, activeGraphNode, onSetRootNode, selection }) => {
  const params = useParams();
  const rest = params["*"];

  useEffect(() => {
    console.log("[Shell:LineageWrapper] rest param changed:", rest);
    if (rest) {
      const decoded = decodeURIComponent(rest);
      let type = "table";
      let id = decoded;
      
      if (decoded.includes(":")) {
        const parts = decoded.split(":");
        type = parts[0] as any;
        id = parts[1];
      }

      console.log("[Shell:LineageWrapper] Parsed entity:", { type, id }, "Current active:", activeGraphNode);

      // Check if current active node is already this one to avoid loops
      if (!activeGraphNode || activeGraphNode.id !== id || activeGraphNode.type !== type) {
        console.log("[Shell:LineageWrapper] Requesting root node update to:", id);
        onSetRootNode({ type, id });
      } else {
        console.log("[Shell:LineageWrapper] Entity already matches activeGraphNode, skipping update.");
      }
    }
  }, [rest, activeGraphNode, onSetRootNode]);

  return (
    <RemoteMount
      key={`lineage-${rest || 'home'}`}
      scope="lineage"
      module="./index"
      url={config.LINEAGE_MFE_URL}
      mountProps={{
        onSelect: onSelectNode,
        rootNode: activeGraphNode,
        initialSelection: selection,
        path: rest
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
      key={`catalog-${domain}-${rest?.split('/')[0] || 'landing'}`}
      scope="tableDetailViewer"
      module="./views"
      url={config.CATALOG_MFE_URL}
      mountProps={{ 
        mode: "STANDALONE",
        domain,
        id: rest?.split('/')[0],
        path: location.pathname
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

import { AuditLanding } from "../views/landing/AuditLanding";
import { UsersLanding } from "../views/landing/UsersLanding";
import { UserDetail } from "../views/landing/UserDetail";
import { DashboardLanding } from "../views/landing/DashboardLanding";

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
      <Route path="/" element={<DashboardLanding />} />
      <Route path="/diag" element={<Diagnostics />} />
      <Route path="/authorized" element={<AuthCallback />} />
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
      <Route path="/users" element={<UsersLanding />} />
      <Route path="/users/:userId" element={<UserDetail />} />
      <Route path="/audit" element={<AuditLanding />} />
      <Route path="/settings" element={<Placeholder title="Settings" />} />
    </Routes>
  );
};

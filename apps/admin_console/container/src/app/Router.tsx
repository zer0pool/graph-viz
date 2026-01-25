import React from "react";
import { Routes, Route } from "react-router-dom";
import { RemoteMount } from "../mfe/RemoteMount";
import { AuthCallback } from "./AuthCallback";
import { config } from "../config";
import "../styles/app/Router.css";

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

const Placeholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold">{title} Page</h1>
    <p className="mt-4 text-gray-500">Coming soon...</p>
  </div>
);

export const AppRouter: React.FC<{
  onSelectNode: (event: any) => void;
  activeGraphNode: any;
  selection?: any;
}> = ({ onSelectNode, activeGraphNode, selection }) => {
  const location = require("react-router-dom").useLocation();
  console.log("[Shell:Router] Current Location:", location.pathname);
  console.log("[Shell:Router] Rendering AppRouter. Config:", {
    // @ts-ignore
    ENABLE_MFE_LINEAGE: config.ENABLE_MFE_LINEAGE,
    // @ts-ignore
    ENABLE_MFE_CATALOG: config.ENABLE_MFE_CATALOG,
    // @ts-ignore
    LINEAGE_MFE_URL: config.LINEAGE_MFE_URL,
    // @ts-ignore
    CATALOG_MFE_URL: config.CATALOG_MFE_URL,
  });

  return (
    <Routes>
      <Route path="/" element={<Placeholder title="Dashboard" />} />
      <Route path="/diag" element={<Diagnostics />} />
      <Route path="/authorized" element={<AuthCallback />} />
      {/* Lineage MFE */}
      {/* @ts-ignore */}
      {config.ENABLE_MFE_LINEAGE && (
        <Route
          path="/lineage/*"
          element={
            <RemoteMount
              key="lineage"
              scope="lineage"
              module="./index"
              url={config.LINEAGE_MFE_URL}
              mountProps={{
                onSelect: onSelectNode,
                rootNode: activeGraphNode,
                initialSelection: selection,
              }}
              visible={true}
            />
          }
        />
      )}

      {/* Table/Job Detail Viewer MFE - Landing & Detail */}
      {/* @ts-ignore */}
      {config.ENABLE_MFE_CATALOG && (
        <>
          {/* Catalog MFE: Handles Jobs, Tables, and Projects */}
          {/* @ts-ignore */}
          {config.ENABLE_MFE_CATALOG &&
            ["jobs", "tables", "projects"].map((domain) => (
              <Route
                key={`catalog-${domain}`}
                path={`/${domain}/*`}
                element={
                  <RemoteMount
                    key={`mount-${domain}`}
                    scope="tableDetailViewer"
                    module="./views"
                    url={config.CATALOG_MFE_URL}
                    mountProps={{ mode: "STANDALONE" }}
                    visible={true}
                  />
                }
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

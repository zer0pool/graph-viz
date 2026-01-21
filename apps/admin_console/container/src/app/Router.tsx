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

import { AuditLanding, UsersLanding } from "../views/landing/Placeholders";

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
}> = ({ onSelectNode, activeGraphNode, selection }) => (
  <Routes>
    <Route path="/" element={<Placeholder title="Dashboard" />} />
    <Route path="/diag" element={<Diagnostics />} />
    <Route path="/authorized" element={<AuthCallback />} />
    {/* Lineage MFE */}
    {config.ENABLE_LINEAGE_MFE && (
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
    {config.ENABLE_TABLE_DETAIL_MFE && (
      <>
        <Route
          path="/jobs/*"
          element={
            <RemoteMount
              key="tableDetailViewer-jobs"
              scope="tableDetailViewer"
              module="./views"
              url={config.TABLE_DETAIL_MFE_URL}
              mountProps={{ mode: "STANDALONE" }}
              visible={true}
            />
          }
        />
        <Route
          path="/tables/*"
          element={
            <RemoteMount
              key="tableDetailViewer-tables"
              scope="tableDetailViewer"
              module="./views"
              url={config.TABLE_DETAIL_MFE_URL}
              mountProps={{ mode: "STANDALONE" }}
              visible={true}
            />
          }
        />
      </>
    )}

    {/* Shell Managed Landing Pages */}
    <Route path="/users" element={<UsersLanding />} />
    <Route path="/audit" element={<AuditLanding />} />
    <Route path="/settings" element={<Placeholder title="Settings" />} />
  </Routes>
);

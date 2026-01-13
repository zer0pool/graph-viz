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

export const AppRouter: React.FC<{
  onSelectNode: (event: any) => void;
  activeGraphNode: any;
  selection?: any;
}> = ({ onSelectNode, activeGraphNode, selection }) => (
  <Routes>
    <Route
      path="/"
      element={<div className="router-welcome">Welcome to Admin Console</div>}
    />
    <Route path="/diag" element={<Diagnostics />} />
    <Route path="/authorized" element={<AuthCallback />} />
    {config.ENABLE_LINEAGE_MFE && (
      <Route
        path="/lineage"
        element={
          <RemoteMount
            scope="lineage"
            module="./index"
            url="http://localhost:3001/remoteEntry.js"
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
    <Route
      path="/jobs/:jobId"
      element={
        <RemoteMount
          scope="tableDetailViewer"
          module="./views"
          url="http://localhost:3002/remoteEntry.js"
          mountProps={{ mode: "STANDALONE" }}
          visible={true}
        />
      }
    />
    <Route
      path="/tables/:tableName"
      element={
        <RemoteMount
          scope="tableDetailViewer"
          module="./views"
          url="http://localhost:3002/remoteEntry.js"
          mountProps={{ mode: "STANDALONE" }}
          visible={true}
        />
      }
    />
  </Routes>
);

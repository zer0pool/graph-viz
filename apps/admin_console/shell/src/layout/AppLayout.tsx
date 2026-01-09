import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import "../styles/legacy.css"; // Import legacy styles

interface AppLayoutProps {
  children: React.ReactNode;
  onSelectGraphNode: (node: any) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onSelectGraphNode,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar onSelectGraphNode={onSelectGraphNode} />
      <div
        id="main-layout"
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        <Sidebar />
        <main
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
            background: "#f5f5f5",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

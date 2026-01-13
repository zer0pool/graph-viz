import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import "../styles/layout/AppLayout.css";

interface AppLayoutProps {
  children: React.ReactNode;
  onSelectGraphNode: (node: any) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onSelectGraphNode,
}) => {
  return (
    <div className="app-container">
      <Navbar onSelectGraphNode={onSelectGraphNode} />
      <div id="main-layout" className="main-layout">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

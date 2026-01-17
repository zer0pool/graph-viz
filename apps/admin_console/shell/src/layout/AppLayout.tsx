import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { cn } from "../lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onSelectGraphNode: (node: any) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onSelectGraphNode,
}) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar onSelectGraphNode={onSelectGraphNode} />
      <div className="flex flex-1 overflow-hidden bg-[#eef2f7]">
        <Sidebar />
        <main className="flex-1 p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

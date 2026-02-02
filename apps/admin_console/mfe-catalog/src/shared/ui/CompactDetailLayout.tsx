import React from "react";
import { ViewMode } from "../types";
import { Tabs, Tab } from "./DetailLayout"; // Import generic components

export const CompactDetailLayout: React.FC<{
  title: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
  owner?: string;
  type?: "table" | "job";
  actions?: React.ReactNode;
}> = ({ title, tabs, activeTab, onTabChange, children, owner, type = "table", actions }) => {
  const isJob = type === "job";
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Header for Embedded - GCP style */}
      <div className="px-6 py-4 border-b border-[#e5e7eb] bg-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                isJob ? "bg-green-50 text-green-700 border-green-100" : "bg-[#f0f7ff] text-[#0061ff] border-[#d0e4ff]"
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{type === "job" ? "Job" : "Table"}</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-[#111827] mb-0.5">{title}</h1>
            <div className="text-sm text-[#6b7280]">{owner || "-"}</div>
          </div>
          {actions && <div className="flex items-center">{actions}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10">
        <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
      </div>

      {/* Main Content - No background, cleaner look */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

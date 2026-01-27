import React from "react";
import { ViewMode } from "../types";

// Simple Tabs component for the layout
// GCP-style Tabs component
const Tabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) => (
  <div className="flex border-b border-[#dadce0] bg-white px-4">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`px-6 py-4 text-sm font-medium transition-all relative ${
          active === t.id
            ? "text-[#1a73e8]"
            : "text-[#5f6368] hover:text-[#202124] hover:bg-[#f8f9fa]"
        }`}
      >
        {t.label}
        {active === t.id && (
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#1a73e8]"></div>
        )}
      </button>
    ))}
  </div>
);

export type Tab = { id: string; label: string };

export const DetailLayout: React.FC<{
  title: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  mode: ViewMode;
  children: React.ReactNode;
  owner?: string;
  lifecycle?: string;
}> = ({ title, tabs, activeTab, onTabChange, mode, children, owner, lifecycle }) => {
  return (
    <div className="h-full flex flex-col bg-[#f1f3f4] min-h-screen">
      {/* GCP Header */}
      <header className="bg-white px-8 py-5 border-b border-[#dadce0] flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#e8f0fe] rounded flex items-center justify-center text-[#1a73e8] font-bold">T</div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-[#5f6368] font-bold uppercase tracking-wider">Table</span>
            </div>
            <h1 className="text-xl font-medium text-[#202124] flex items-center gap-3">
              {title}
              <span className="text-lg text-[#bdc1c6] cursor-pointer hover:text-[#1a73e8] transition-colors font-normal">☆</span>
            </h1>
          </div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#5f6368] font-bold uppercase mb-0.5">Owner</span>
            <div className="flex items-center gap-1.5 text-sm text-[#202124]">
              <span className="text-xs">👥</span> {owner || "data-team-a"}
            </div>
          </div>
          <div className="w-px h-8 bg-[#dadce0]"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#5f6368] font-bold uppercase mb-0.5">Lifecycle</span>
            <span className="text-sm font-medium text-[#202124]">{lifecycle || "experimental"}</span>
          </div>
          <button className="ml-4 p-2 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-10">
        <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

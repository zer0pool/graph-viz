import React from "react";
import { ViewMode } from "../types";

// Simple Tabs component for the layout
const Tabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) => (
  <div className="flex gap-1 border-b border-gray-100 bg-gray-50/50 px-2">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`px-5 py-3 text-xs font-bold tracking-wider uppercase transition-all border-b-2 ${
          active === t.id
            ? "border-blue-600 text-blue-600 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
        }`}
      >
        {t.label}
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
}> = ({ title, tabs, activeTab, onTabChange, mode, children }) => {
  return (
    <div
      className={`h-full flex flex-col bg-white ${
        mode === "PAGE" ? "max-w-6xl mx-auto shadow-xl min-h-screen" : "w-full"
      }`}
    >
      <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
          {title}
        </h3>
        {mode === "PAGE" && (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-widest">
            Standalone View
          </span>
        )}
      </header>

      <div className="sticky top-[72px] z-10 bg-white shadow-sm">
        <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
      </div>

      <main className="flex-1 overflow-y-auto bg-slate-50/30">
        <div className="max-w-full">{children}</div>
      </main>
    </div>
  );
};

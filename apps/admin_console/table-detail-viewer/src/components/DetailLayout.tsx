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
  <div style={{ display: "flex", gap: 16, borderBottom: "1px solid #eee" }}>
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: "8px 12px",
          border: "none",
          background: "none",
          borderBottom: active === t.id ? "2px solid #2563eb" : "none",
          color: active === t.id ? "#2563eb" : "#666",
          cursor: "pointer",
        }}
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
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxWidth: mode === "PAGE" ? 1200 : "100%",
        margin: mode === "PAGE" ? "0 auto" : undefined,
        background: "#fff",
      }}
    >
      <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
        <h3>{title}</h3>
      </div>

      <div style={{ padding: "0 16px" }}>
        <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
      </div>

      <div style={{ flex: 1, padding: 16, overflow: "auto" }}>{children}</div>
    </div>
  );
};

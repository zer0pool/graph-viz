import React from "react";
import { Sidebar } from "./Sidebar";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", height: "100vh" }}>
    <Sidebar />
    <main style={{ flex: 1, padding: 16 }}>{children}</main>
  </div>
);  
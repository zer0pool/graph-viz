import React from "react";
import { createRoot } from "react-dom/client";
import { ShellApp } from "../ShellApp";
import { AuthProvider } from "../providers/AuthProvider";

const root = createRoot(document.getElementById("root")!);
root.render(
  <AuthProvider>
    <ShellApp />
  </AuthProvider>
);

import React from "react";
import { createRoot } from "react-dom/client";
import { ShellApp } from "./app/ShellApp";

import { AuthProvider } from "./app/AuthContext";

const root = createRoot(document.getElementById("root")!);
root.render(
  <AuthProvider>
    <ShellApp />
  </AuthProvider>,
);

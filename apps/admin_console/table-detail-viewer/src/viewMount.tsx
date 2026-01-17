import React from "react";
import { createRoot } from "react-dom/client";
import { ViewApp } from "./ViewApp";
import { ApiProvider } from "./components/ApiContext";

export function mount(el: HTMLElement) {
  console.log("[TableDetailViewer:viewMount] mount() called");
  const root = createRoot(el);
  const auth = {
    user: null,
    getToken: async () => null,
    fetchWithAuth: async (url: string, init?: RequestInit) => fetch(url, init),
  };

  console.log("[TableDetailViewer:viewMount] Rendering ViewApp");
  root.render(
    <ApiProvider auth={auth}>
      <ViewApp />
    </ApiProvider>,
  );

  return () => {
    console.log("[TableDetailViewer:viewMount] unmounting");
    root.unmount();
  };
}

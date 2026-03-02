import React from "react";
import "../styles/index.css";
import { createRoot } from "react-dom/client";
import { ViewApp } from "../router/ViewApp";
import { ApiProvider } from "../../shared/api/ApiContext";

export function mount(el: HTMLElement, props: any) {
  try {
    console.log("[TableDetailViewer:viewMount] Mounting with props:", props);
    const root = createRoot(el);
    const auth = props?.auth || {
      user: null,
      getToken: async () => null,
      fetchWithAuth: async (url: string, init?: RequestInit) => fetch(url, init),
    };

    root.render(
      <ApiProvider auth={auth}>
        <ViewApp />
      </ApiProvider>
    );

    return () => {
      queueMicrotask(() => {
        if (root) {
          root.unmount();
        }
      });
    };
  } catch (err) {
    console.error("[TableDetailViewer:viewMount] Error in mount:", err);
    throw err;
  }
}

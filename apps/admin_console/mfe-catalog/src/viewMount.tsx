import React from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import { ViewApp } from "./ViewApp";
import { ApiProvider } from "./components/ApiContext";

export function mount(el: HTMLElement) {
  try {
    const root = createRoot(el);
    const auth = {
      user: null,
      getToken: async () => null,
      fetchWithAuth: async (url: string, init?: RequestInit) =>
        fetch(url, init),
    };

    root.render(
      <ApiProvider auth={auth}>
        <ViewApp />
      </ApiProvider>,
    );

    return () => {
      root.unmount();
    };
  } catch (err) {
    console.error("[TableDetailViewer:viewMount] Error in mount:", err);
    throw err;
  }
}

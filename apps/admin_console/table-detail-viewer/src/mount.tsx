import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ApiProvider } from "./components/ApiContext";
import { AuthClient } from "./types/auth";

export function mount(
  el: HTMLElement,
  options: {
    initialSelection?: any;
    eventTarget?: EventTarget;
    auth?: AuthClient;
  }
) {
  const root = createRoot(el);

  const render = (props: any) => {
    const auth = props.auth || {
      user: null,
      getToken: async () => null,
      fetchWithAuth: async (url: string, init?: RequestInit) =>
        fetch(url, init),
    };

    root.render(
      <ApiProvider auth={auth}>
        <App
          eventTarget={props.eventTarget}
          initialSelection={props.initialSelection}
        />
      </ApiProvider>
    );
  };

  // Initial render
  render(options);

  // 🔹 Handle mountProps updates reactively
  const handlePropsUpdate = (e: any) => {
    // Shell sends the whole mountProps in e.detail or e.detail.detail
    const newSelection = e.detail;
    if (newSelection) {
      console.log("[TableDetailViewer] Reactive update:", newSelection);
      render({ ...options, initialSelection: newSelection });
    }
  };

  el.addEventListener("mfe:selection", handlePropsUpdate);

  return () => {
    el.removeEventListener("mfe:selection", handlePropsUpdate);
    queueMicrotask(() => {
      root.unmount();
    });
  };
}

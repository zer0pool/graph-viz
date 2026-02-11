import React from "react";
import "../styles/index.css";
import { createRoot } from "react-dom/client";
import App from "../App";
import { ApiProvider } from "../../shared/api/ApiContext";
import { AuthClient } from "../../shared/types/auth";
import { BrowserRouter } from "react-router-dom";

export function mount(
  el: HTMLElement,
  options: {
    initialSelection?: any;
    eventTarget?: EventTarget;
    auth?: AuthClient;
  } = {},
) {
  console.log("[TableDetailViewer] mount() called", { options });
  const root = createRoot(el);

  const render = (props: any) => {
    console.log("[TableDetailViewer] rendering with props:", props);
    const auth = props.auth || {
      user: null,
      getToken: async () => null,
      fetchWithAuth: async (url: string, init?: RequestInit) =>
        fetch(url, init),
    };

    root.render(
      <ApiProvider auth={auth}>
        <BrowserRouter>
          <App
            eventTarget={props.eventTarget}
            initialSelection={props.initialSelection}
          />
        </BrowserRouter>
      </ApiProvider>,
    );
  };

  // Initial render
  render(options);

  // 🔹 Handle mountProps updates reactively
  const handlePropsUpdate = (e: any) => {
    console.log("[TableDetailViewer] mfe:selection event received:", e.detail);
    // Shell sends the whole mountProps in e.detail or e.detail.detail
    const newSelection = e.detail;
    if (newSelection) {
      console.log(
        "[TableDetailViewer] Performing reactive update with:",
        newSelection,
      );
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

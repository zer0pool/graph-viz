import React from "react";
import { createRoot } from "react-dom/client";
import { ViewApp } from "./ViewApp";

export function mount(el: HTMLElement) {
  const root = createRoot(el);
  root.render(<ViewApp />);

  return () => root.unmount();
}

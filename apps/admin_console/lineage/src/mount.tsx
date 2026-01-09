import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Selection, SelectHandler } from "./types/graph";

type MountOptions = {
  mode?: "EMBEDDED" | "STANDALONE";
  onSelect?: SelectHandler;
  rootNode?: Selection | null;
};

export function mount(el: HTMLElement, options: MountOptions = {}) {
  const root = createRoot(el);

  const render = (props: MountOptions) => {
    root.render(<App onSelect={props.onSelect} rootNode={props.rootNode} />);
  };

  // Initial render
  render(options);

  // 🔹 Shell에서 보내는 이벤트 감지 (검색 결과 변경 등)
  const handleSelection = (e: any) => {
    const detail = e.detail;
    if (detail) {
      // Shell sends { type, id } in mountProps or detail
      const newNode = detail.type ? detail : detail.detail;
      if (newNode && newNode.type) {
        render({ ...options, rootNode: newNode });
      }
    }
  };

  el.addEventListener("mfe:selection", handleSelection);

  return () => {
    el.removeEventListener("mfe:selection", handleSelection);
    queueMicrotask(() => {
      root.unmount();
    });
  };
}

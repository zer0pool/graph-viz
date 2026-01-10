import { mount } from "./viewMount";

// --- Standalone Auto-Mount Logic ---
// If running from index.html (not via Module Federation container), auto-mount to #root
const rootEl = document.getElementById("root");
if (rootEl && !window.opener && window.location.port === "3002") {
  console.log("[DetailMFE] Detected standalone mode - auto-mounting ViewApp");
  mount(rootEl);
}

export { mount };

// Environment configuration for Shell
// Modern MFE standard: use import.meta.env instead of process.env

export const config = {
  // Fallback to localhost if window config is missing (for npm run dev)
  API_BASE_URL:
    (window as any).__APP_CONFIG__?.API_BASE_URL || "http://localhost:5003",
  BASE_URL: ((window as any).__APP_CONFIG__?.BASE_URL || "/").replace(
    /\/$/,
    ""
  ),
  ENABLE_LINEAGE_MFE:
    (window as any).__APP_CONFIG__?.ENABLE_LINEAGE_MFE !== "false",
  ENABLE_TABLE_DETAIL_MFE:
    (window as any).__APP_CONFIG__?.ENABLE_TABLE_DETAIL_MFE !== "false",
  LINEAGE_MFE_URL:
    (window as any).__APP_CONFIG__?.LINEAGE_MFE_URL ||
    "http://localhost:3001/remoteEntry.js",
  TABLE_DETAIL_MFE_URL:
    (window as any).__APP_CONFIG__?.TABLE_DETAIL_MFE_URL ||
    "http://localhost:3002/remoteEntry.js",
  DEBUG: (import.meta as any).env.DEV === true,
};

// Log configuration for debugging
console.groupCollapsed("[Shell] Configuration & Environment Variables");
console.table(config);
console.log("Raw window.__APP_CONFIG__:", (window as any).__APP_CONFIG__);
console.groupEnd();

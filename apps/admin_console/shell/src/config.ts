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

  // Standalone Auth Config
  ENABLE_AUTH: (window as any).__APP_CONFIG__?.ENABLE_AUTH !== "false", // Default true
  OIDC_AUTHORITY:
    (window as any).__APP_CONFIG__?.OIDC_AUTHORITY ||
    "https://accounts.google.com",
  OIDC_CLIENT_ID: (window as any).__APP_CONFIG__?.OIDC_CLIENT_ID || "",
  OIDC_CLIENT_SECRET: (window as any).__APP_CONFIG__?.OIDC_CLIENT_SECRET || "",
  OIDC_RESPONSE_TYPE:
    (window as any).__APP_CONFIG__?.OIDC_RESPONSE_TYPE || "code id_token",
  OIDC_RESPONSE_MODE: (window as any).__APP_CONFIG__?.OIDC_RESPONSE_MODE || "",
  OIDC_AUTH_ENDPOINT: (window as any).__APP_CONFIG__?.OIDC_AUTH_ENDPOINT || "",
  OIDC_TOKEN_ENDPOINT:
    (window as any).__APP_CONFIG__?.OIDC_TOKEN_ENDPOINT || "",
  OIDC_REDIRECT_URI: (window as any).__APP_CONFIG__?.OIDC_REDIRECT_URI || "",
  OIDC_SCOPE:
    (window as any).__APP_CONFIG__?.OIDC_SCOPE || "openid profile email",
  OIDC_RESOURCE: (window as any).__APP_CONFIG__?.OIDC_RESOURCE || "",
  OIDC_USERINFO_ENDPOINT:
    (window as any).__APP_CONFIG__?.OIDC_USERINFO_ENDPOINT || "",

  DEBUG: (import.meta as any).env.DEV === true,
};

// Log configuration for debugging
console.groupCollapsed("[Shell] Configuration & Environment Variables");
console.table(config);
console.log("Raw window.__APP_CONFIG__:", (window as any).__APP_CONFIG__);
console.groupEnd();

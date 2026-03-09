// Environment configuration for Shell
// Modern MFE standard: use import.meta.env instead of process.env

export const config = {
  // Fallback to localhost if window config is missing (for npm run dev)
  BASE_URL: ((window as any).__APP_CONFIG__?.BASE_URL || "/admin-console").replace(/\/$/, ""),
  ENABLE_MFE_LINEAGE: (window as any).__APP_CONFIG__?.ENABLE_LINEAGE_MFE !== "false",
  ENABLE_MFE_CATALOG: (window as any).__APP_CONFIG__?.ENABLE_CATALOG_MFE !== "false",
  LINEAGE_MFE_URL:
    (window as any).__APP_CONFIG__?.LINEAGE_MFE_URL || "/admin-console/mfe-lineage/remoteEntry.js",
  CATALOG_MFE_URL:
    (window as any).__APP_CONFIG__?.CATALOG_MFE_URL || "/admin-console/mfe-catalog/remoteEntry.js",
  BACKEND_HOST: (window as any).__APP_CONFIG__?.BACKEND_HOST || "",

  // Standalone Auth Config
  ENABLE_AUTH: (window as any).__APP_CONFIG__?.ENABLE_AUTH !== "false", // Default true
  OIDC_AUTHORITY: (window as any).__APP_CONFIG__?.OIDC_AUTHORITY || "https://accounts.google.com",
  OIDC_CLIENT_ID: (window as any).__APP_CONFIG__?.OIDC_CLIENT_ID || "",
  OIDC_CLIENT_SECRET: (window as any).__APP_CONFIG__?.OIDC_CLIENT_SECRET || "",
  OIDC_RESPONSE_TYPE: (window as any).__APP_CONFIG__?.OIDC_RESPONSE_TYPE || "code id_token",
  OIDC_RESPONSE_MODE: (window as any).__APP_CONFIG__?.OIDC_RESPONSE_MODE || "",
  OIDC_AUTH_ENDPOINT: (window as any).__APP_CONFIG__?.OIDC_AUTH_ENDPOINT || "",
  OIDC_TOKEN_ENDPOINT: (window as any).__APP_CONFIG__?.OIDC_TOKEN_ENDPOINT || "",
  OIDC_REDIRECT_URI: (window as any).__APP_CONFIG__?.OIDC_REDIRECT_URI || "",
  OIDC_SCOPE: (window as any).__APP_CONFIG__?.OIDC_SCOPE || "openid profile email",
  OIDC_RESOURCE: (window as any).__APP_CONFIG__?.OIDC_RESOURCE || "",
  OIDC_USERINFO_ENDPOINT: (window as any).__APP_CONFIG__?.OIDC_USERINFO_ENDPOINT || "",
  REQUIRE_SIGNIN: (window as any).__APP_CONFIG__?.REQUIRE_SIGNIN === "true",
  REST_API_DOCS_URL: (window as any).__APP_CONFIG__?.REST_API_DOCS_URL || "http://localhost:5100/admin-console/docs",
  GRAPHQL_API_DOCS_URL: (window as any).__APP_CONFIG__?.GRAPHQL_API_DOCS_URL || "http://localhost:5100/admin-console/analytics-manager/graphql",

  DEBUG: process.env.NODE_ENV !== "production",
};

// Log configuration for debugging
console.groupCollapsed("[Shell] Configuration & Environment Variables");
console.table(config);
console.log("Raw window.__APP_CONFIG__:", (window as any).__APP_CONFIG__);
console.groupEnd();

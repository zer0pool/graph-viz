// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

// Runtime Configuration Support
const runtimeConfig = (window as any).__APP_CONFIG__ || {};

export const config = {
  // Use runtime config if available, fallback to build-time env
  BASE_URL: runtimeConfig.BASE_URL || "/admin-console",
  LINEAGE_MFE_URL: runtimeConfig.LINEAGE_MFE_URL || "/admin-console/mfe-lineage/remoteEntry.js",
  NODE_ENV: (import.meta as any).env.NODE_ENV || "development",
};

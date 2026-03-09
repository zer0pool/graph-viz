// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

const isDev = (import.meta as any).env.DEV === true;

// Runtime Configuration Support
const runtimeConfig = (window as any).__APP_CONFIG__ || {};

export const config = {
  // Use runtime config if available, fallback to build-time env
  BASE_URL: runtimeConfig.BASE_URL || "/admin-console",
  CATALOG_MFE_URL: runtimeConfig.CATALOG_MFE_URL || "/admin-console/mfe-catalog/remoteEntry.js",
  DEBUG: isDev,
  // Progressive Loading Limit (default: 10)
  PROGRESSIVE_LOADING_LIMIT: Number((import.meta as any).env.VITE_PROGRESSIVE_LOADING_LIMIT || 10),
};

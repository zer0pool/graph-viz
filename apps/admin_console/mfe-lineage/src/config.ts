// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

const isDev = (import.meta as any).env.DEV === true;

// Runtime Configuration Support
const runtimeConfig = (window as any).__APP_CONFIG__ || {};

export const config = {
  // Use runtime config if available, fallback to build-time env
  API_BASE_URL:
    runtimeConfig.API_BASE_URL ||
    (import.meta as any).env.VITE_API_BASE_URL ||
    "",
  DEBUG: isDev,
  // Progressive Loading Limit (default: 3)
  PROGRESSIVE_LOADING_LIMIT: Number(
    (import.meta as any).env.VITE_PROGRESSIVE_LOADING_LIMIT || 3
  ),
};

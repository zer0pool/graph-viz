// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

const isDev = (import.meta as any).env.DEV === true;

export const config = {
  // Always use relative path in dev to force proxy
  API_BASE_URL: isDev ? "" : (import.meta as any).env.VITE_API_BASE_URL || "",
  DEBUG: isDev,
  // Progressive Loading Limit (default: 3)
  PROGRESSIVE_LOADING_LIMIT: Number(
    (import.meta as any).env.VITE_PROGRESSIVE_LOADING_LIMIT || 3
  ),
};

// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

// Runtime Configuration Support
const runtimeConfig = (window as any).__APP_CONFIG__ || {};

export const config = {
  // Use runtime config if available, fallback to build-time env
  API_BASE_URL:
    runtimeConfig.API_BASE_URL || (__API_BASE_URL__ as string) || "",
  BASE_URL: runtimeConfig.BASE_URL || "/admin-console",
  NODE_ENV: import.meta.env.NODE_ENV || "development",
};

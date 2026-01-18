// Environment configuration
// Modern MFE standard: use import.meta.env instead of process.env

// Runtime Configuration Support
const runtimeConfig = (window as any).__APP_CONFIG__ || {};

export const config = {
  // Use runtime config if available, fallback to build-time env
  API_BASE_URL:
    runtimeConfig.API_BASE_URL || (__API_BASE_URL__ as string) || "",
  NODE_ENV: (__NODE_ENV__ as string) || "development",
};

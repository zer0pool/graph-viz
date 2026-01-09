// Environment configuration for Shell
// Modern MFE standard: use import.meta.env instead of process.env

export const config = {
  // Use relative path - webpack dev server will proxy to backend
  // Mapped via Webpack DefinePlugin
  API_BASE_URL: (import.meta as any).env.VITE_API_BASE_URL || "",
  DEBUG: (import.meta as any).env.DEV === true,
};

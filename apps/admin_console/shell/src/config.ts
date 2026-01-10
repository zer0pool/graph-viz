// Environment configuration for Shell
// Modern MFE standard: use import.meta.env instead of process.env

export const config = {
  API_BASE_URL: (window as any).__APP_CONFIG__?.API_BASE_URL || "/api",
  BASE_URL: (window as any).__APP_CONFIG__?.BASE_URL || "",
  ENABLE_LINEAGE_MFE:
    (window as any).__APP_CONFIG__?.ENABLE_LINEAGE_MFE !== "false",
  ENABLE_TABLE_DETAIL_MFE:
    (window as any).__APP_CONFIG__?.ENABLE_TABLE_DETAIL_MFE !== "false",
  DEBUG: (import.meta as any).env.DEV === true,
};

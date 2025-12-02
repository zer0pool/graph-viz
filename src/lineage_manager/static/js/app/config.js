export const EVENT_ID_STORAGE_KEY = "lm.lastEventId";
export const BASE_URL = "/lineage-manager";

export const SELECTORS = {
  navTabs: "#nav-tabs",
  searchInput: "#jobId",
  searchButton: "#loadBtn",
  suggestions: "#suggestions",
  filterType: "#type-filter",
  filterStatus: "#status-filter",
  filterDepth: "#depth-filter",
  resetGraph: "#reset-graph",
  graphToolbar: "#graph-toolbar",
  zoomControls: {
    in: "#zoom-in",
    out: "#zoom-out",
    reset: "#reset-view",
    zoomReset: "#zoom-reset",
    minimap: "#minimap-toggle",
  },
  ctxMenu: "#ctx-menu",
  graphContainer: "#cy",
  graphStatus: "#graph-status",
};

export function readPollInterval() {
  const raw = document.body?.dataset?.pollInterval;
  const parsed = Number(raw || "15000");
  return Number.isFinite(parsed) ? parsed : 15000;
}

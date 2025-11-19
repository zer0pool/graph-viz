import { SELECTORS, readPollInterval } from "./config.js";
import { ApiClient } from "./services/api.js";
import { EventService } from "./services/events.js";
import { PanelController } from "./ui/panel.js";
import { GraphController } from "./graph/graph.js";
import { ControlBar } from "./ui/controls.js";
import { FilterState, SearchState, SelectionState, RelationState } from "./state.js";

(function bootstrap() {
  document.addEventListener("DOMContentLoaded", async () => {
    await window.authReady;
    const pollInterval = readPollInterval();
    document.body.dataset.pollInterval = String(pollInterval);

    const api = new ApiClient(window.authClient);
    const filterState = new FilterState();
    const searchState = new SearchState();
    const selectionState = new SelectionState();
    const relationState = new RelationState();
    const panel = new PanelController(api);
    const graph = new GraphController({
      panel,
      filterState,
      selectionState,
      relationState,
      api,
      searchState,
    });
    graph.init(document.querySelector(SELECTORS.graphContainer));

    const controls = new ControlBar({ api, graph, panel, filterState, searchState });
    controls.init();
    setupExplorerShell();

    let events = null;
    if (window.authClient.requireAuth) {
      events = new EventService({ api, graph, panel, searchState, filterState });
      if (window.authClient.isAuthenticated()) {
        events.start();
      }
      document.addEventListener("auth:state-changed", (evt) => {
        if (evt.detail?.authenticated) {
          events.start();
        } else {
          events.stop();
          graph.clearSelection();
          graph.renderGraph({ nodes: [], edges: [] }, { resetViewport: true });
        }
      });
    }
  });
})();

function setupExplorerShell() {
  const controlPanel = document.getElementById("control-panel");
  const detailPanel = document.getElementById("detail-panel");
  const controlToggle = document.getElementById("control-toggle");
  const detailToggle = document.getElementById("detail-toggle");
  if (!controlPanel && !detailPanel) return;

  const setPanelState = (panel, button, open) => {
    if (!panel || !button) return;
    panel.classList.toggle("collapsed", !open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    const collapsedIcon = button.dataset?.collapsedIcon || "›";
    const expandedIcon = button.dataset?.expandedIcon || "‹";
    const chevron = button.querySelector(".chevron");
    if (chevron) chevron.textContent = open ? expandedIcon : collapsedIcon;
  };

  const togglePanel = (panel, button) => {
    if (!panel || !button) return false;
    const nextOpen = panel.classList.contains("collapsed");
    setPanelState(panel, button, nextOpen);
    return nextOpen;
  };

  let detailManual = false;

  controlToggle?.addEventListener("click", () => {
    togglePanel(controlPanel, controlToggle);
  });

  detailToggle?.addEventListener("click", () => {
    detailManual = true;
    togglePanel(detailPanel, detailToggle);
  });

  if (controlPanel && controlToggle) {
    setPanelState(controlPanel, controlToggle, !controlPanel.classList.contains("collapsed"));
  }
  if (detailPanel && detailToggle) {
    setPanelState(detailPanel, detailToggle, !detailPanel.classList.contains("collapsed"));
  }

  document.addEventListener("detail-panel:selection", (evt) => {
    if (!detailPanel || !detailToggle || detailManual) return;
    const open = Boolean(evt.detail?.hasSelection);
    setPanelState(detailPanel, detailToggle, open);
  });
}

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
    setupViewToggle(graph);
    setupDetailTabs();
    setupDetailResizer();

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
    if (!detailPanel || !detailToggle) return;
    const open = Boolean(evt.detail?.hasSelection);
    detailManual = false;
    setPanelState(detailPanel, detailToggle, open);
  });

  document.addEventListener("detail-panel:toggle", () => {
    detailManual = true;
    togglePanel(detailPanel, detailToggle);
  });
}

function setupViewToggle(graph) {
  const tabs = document.querySelectorAll(".view-tab");
  if (!tabs.length) return;
  const setActive = (mode) => {
    tabs.forEach((btn) => {
      const isList = btn.textContent.trim().toLowerCase() === "list";
      const active = mode === "list" ? isList : !isList;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    graph.setViewMode(mode);
  };
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.textContent.trim().toLowerCase() === "list" ? "list" : "graph";
      setActive(mode);
    });
  });
  setActive("graph");
}

function setupDetailTabs() {
  const groups = document.querySelectorAll(".detail-tabs");
  if (!groups.length) return;
  groups.forEach((group) => {
    const tabs = group.querySelectorAll(".detail-tab");
    if (!tabs.length) return;
    const groupName = group.dataset.tabGroup || "default";
    const panelsContainer = document.querySelector(`.detail-tab-panels[data-tab-group="${groupName}"]`);
    const panes = panelsContainer ? panelsContainer.querySelectorAll(".detail-pane") : document.querySelectorAll(
      `.detail-pane[data-tab-panel][data-group="${groupName}"]`
    );
    const defaultTab = group.dataset.defaultTab || tabs[0]?.dataset.tab || "schema";
    const activate = (target, suppressEvent = false) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === target;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      panes.forEach((pane) => {
        pane.classList.toggle("active", pane.dataset.tabPanel === target);
      });
      if (!suppressEvent) {
        document.dispatchEvent(
          new CustomEvent("detail-tabs:changed", {
            detail: { group: groupName, tab: target },
          })
        );
      }
    };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab || defaultTab;
        activate(target);
      });
    });
    activate(defaultTab, true);
  });
}

function setupDetailResizer() {
  const detailPanel = document.getElementById("detail-panel");
  const resizer = document.getElementById("detail-resizer");
  if (!detailPanel || !resizer) return;
  const clampWidth = (width) => {
    const min = Math.max(window.innerWidth * 0.2, 240);
    const max = Math.max(window.innerWidth * 0.5, min + 40);
    return Math.min(Math.max(width, min), max);
  };

  const applyWidth = (width) => {
    const clamped = clampWidth(width);
    currentWidth = clamped;
    document.documentElement.style.setProperty("--detail-panel-width", `${clamped}px`);
    detailPanel.style.width = `${clamped}px`;
  };

  let startX = 0;
  let startWidth = 0;
  let dragging = false;
  let currentWidth = detailPanel.getBoundingClientRect().width;

  const stopDrag = () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  const handleDrag = (event) => {
    if (!dragging) return;
    const delta = startX - event.clientX;
    applyWidth(startWidth + delta);
  };

  resizer.addEventListener("mousedown", (event) => {
    if (detailPanel.classList.contains("collapsed")) return;
    dragging = true;
    startX = event.clientX;
    startWidth = detailPanel.getBoundingClientRect().width;
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);
  });

  window.addEventListener("resize", () => {
    const current = detailPanel.getBoundingClientRect().width;
    if (!detailPanel.classList.contains("collapsed")) {
      applyWidth(current);
    }
  });

  const observer = new MutationObserver(() => {
    const collapsed = detailPanel.classList.contains("collapsed");
    resizer.hidden = collapsed;
    if (collapsed) {
      detailPanel.style.removeProperty("width");
    } else {
      applyWidth(currentWidth);
    }
  });
  observer.observe(detailPanel, { attributes: true, attributeFilter: ["class"] });
  resizer.hidden = detailPanel.classList.contains("collapsed");
}

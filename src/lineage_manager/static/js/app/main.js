/**
 * Main Application Orchestrator
 * Pure DI composition - all modules initialized and wired together
 * Refactored from 247 lines to ~80 lines (pure orchestration)
 */

import { SELECTORS, readPollInterval } from "./config.js";
import { ApiClient } from "./services/api.js";
import { EventService } from "./services/events.js";
import { PanelController } from "./ui/panelControllerNew.js";
import { GraphController } from "./graph/graphControllerNew.js";
import { ControlBar } from "./ui/controlBarNew.js";
import { FilterState, SearchState, SelectionState, RelationState } from "./state.js";
import { setupExplorerShell, setupViewToggle, setupDetailTabs, setupDetailResizer } from "./setup/layoutSetup.js";

(function bootstrap() {
  document.addEventListener("DOMContentLoaded", async () => {
    await window.authReady;

    // Initialize app container
    const app = new App();
    await app.init();
  });
})();

/**
 * App - Main container for all services and modules
 */
class App {
  async init() {
    const pollInterval = readPollInterval();
    document.body.dataset.pollInterval = String(pollInterval);

    // Create state
    const filterState = new FilterState();
    const searchState = new SearchState();
    const selectionState = new SelectionState();
    const relationState = new RelationState();

    // Create services
    const api = new ApiClient(window.authClient);

    // Create main controllers
    const panel = new PanelController(api);
    const graph = new GraphController({
      panel,
      filterState,
      selectionState,
      relationState,
      api,
      searchState,
    });
    const controls = new ControlBar({ api, graph, panel, filterState, searchState });

    // Initialize graph
    graph.init(document.querySelector(SELECTORS.graphContainer));

    // Initialize controls
    controls.init();

    // Setup UI shell
    setupExplorerShell();
    setupViewToggle(graph);
    setupDetailTabs();
    setupDetailResizer();

    // Setup auth-dependent features
    if (window.authClient.requireAuth) {
      const events = new EventService({ api, graph, panel, searchState, filterState });

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
  }
}

export default App;


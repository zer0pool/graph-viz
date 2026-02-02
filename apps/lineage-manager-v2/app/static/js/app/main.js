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
import ListView from "./ui/listView.js";
import { ControlBar } from "./ui/controlBarNew.js";
import { FilterState, SearchState, RelationState, selectionState, lineageState } from "./state.js";
import { ResponsiveToolbar } from "./ui/responsiveToolbar.js";
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

    // Create state (Use shared singletons where available)
    const filterState = new FilterState();
    const searchState = new SearchState();
    const relationState = new RelationState();
    // selectionState is imported as singleton

    // Create services
    const api = new ApiClient(window.authClient);

    // Create main controllers
    const panel = new PanelController(api);
    await panel.init();

    // Inject shared state into GraphController
    const graph = new GraphController({
      panel,
      filterState,
      // selectionState removed - used as singleton
      relationState,
      api,
      searchState,
    });

    const listView = new ListView(api, graph);

    const controls = new ControlBar({ api, graph, panel, filterState, searchState });

    const responsiveToolbar = new ResponsiveToolbar();

    // Initialize graph
    graph.init(document.querySelector(SELECTORS.graphContainer));

    // Initialize controls
    controls.init();
    responsiveToolbar.init();

    // Setup UI shell
    setupExplorerShell();
    setupViewToggle(graph, listView);
    setupDetailTabs();
    setupDetailResizer();

    // Check for deep links
    this.handleUrlParams(controls);
  }

  handleUrlParams(controls) {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job_id");
    const tableName = params.get("table_name") || params.get("table") || params.get("node");

    if (jobId) {
      console.log("Deep link: initializing with job", jobId);
      // Wait briefly for init? Or just call immediately.
      controls.handleSearch(jobId, "job");
    } else if (tableName) {
      console.log("Deep link: initializing with table", tableName);
      controls.handleSearch(tableName, "table");
    }
  }
}

export default App;


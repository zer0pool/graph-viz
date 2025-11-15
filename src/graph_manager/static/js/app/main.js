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
        graph.renderGraph({ nodes: [], edges: [] });
      }
    });
  });
})();

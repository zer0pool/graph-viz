import { SELECTORS } from "../config.js";

export class ControlBar {
  constructor({ api, graph, panel, filterState, searchState }) {
    this.api = api;
    this.graph = graph;
    this.panel = panel;
    this.filterState = filterState;
    this.searchState = searchState;
    this.elements = {
      searchInput: document.querySelector(SELECTORS.searchInput),
      searchButton: document.querySelector(SELECTORS.searchButton),
      suggestions: document.querySelector(SELECTORS.suggestions),
      filterType: document.querySelector(SELECTORS.filterType),
      filterStatus: document.querySelector(SELECTORS.filterStatus),
      filterDepth: document.querySelector(SELECTORS.filterDepth),
      resetGraph: document.querySelector(SELECTORS.resetGraph),
    };
    this.actionButtons = {
      focus: document.getElementById("action-focus"),
      expandUp: document.getElementById("action-expand-up"),
      expandDown: document.getElementById("action-expand-down"),
      expandBoth: document.getElementById("action-expand-both"),
      layout: document.getElementById("layout-reset"),
      highlight: document.getElementById("highlight-path"),
      clear: document.getElementById("clear-selection"),
    };
  }

  init() {
    this.bindSearchInput();
    this.bindFilters();
    this.bindReset();
    this.bindActions();
  }

  bindSearchInput() {
    const input = this.elements.searchInput;
    const button = this.elements.searchButton;
    const suggestions = this.elements.suggestions;
    if (!input || !button || !suggestions) return;

    const onInput = this.debounce(async () => {
      const q = input.value.trim();
      this.searchState.resetActive();
      if (!q) {
        suggestions.hidden = true;
        suggestions.innerHTML = "";
        return;
      }
      suggestions.hidden = false;
      suggestions.innerHTML = '<div class="loading">Loading…</div>';
      try {
        const data = await this.api.fetchSuggestions(q);
        this.renderSuggestions(data, suggestions, input);
      } catch (err) {
        suggestions.innerHTML = '<div class="group">No results</div>';
      }
    }, 200);

    input.addEventListener("input", onInput);
    input.addEventListener("blur", () => setTimeout(() => {
      if (!suggestions.matches(":hover")) {
        suggestions.hidden = true;
        suggestions.innerHTML = "";
      }
    }, 150));
    input.addEventListener("keydown", (e) => this.handleSuggestionKeys(e, suggestions));
    button.addEventListener("click", () => this.submitSearch());
  }

  renderSuggestions(data, box, input) {
    const jobs = data.jobs || [];
    const tables = data.tables || [];
    let html = "";
    if (!jobs.length && !tables.length) {
      box.innerHTML = '<div class="group">No results</div>';
      return;
    }
    if (jobs.length) {
      html += '<div class="group">Jobs</div>';
      html += jobs
        .map((j) => `<div class="item" data-type="job" data-value="${encodeURIComponent(j.job_id)}"><span class="badge">JOB</span>${j.name || j.job_id}</div>`)
        .join("");
    }
    if (tables.length) {
      html += '<div class="group">Tables</div>';
      html += tables
        .map((t) => `<div class="item" data-type="table" data-value="${encodeURIComponent(t.full_name)}"><span class="badge">TABLE</span>${t.full_name}</div>`)
        .join("");
    }
    box.innerHTML = html;
    box.hidden = false;
    const items = Array.from(box.querySelectorAll(".item"));
    this.searchState.itemsCount = items.length;
    this.searchState.activeIndex = items.length ? 0 : -1;
    if (items.length) items[0].classList.add("active");
    items.forEach((el, idx) => {
      el.addEventListener("mouseenter", () => {
        items.forEach((i) => i.classList.remove("active"));
        el.classList.add("active");
        this.searchState.activeIndex = idx;
      });
      el.addEventListener("click", () => {
        const type = el.getAttribute("data-type");
        const value = decodeURIComponent(el.getAttribute("data-value") || "");
        input.value = value;
        this.searchState.selectedType = type;
        this.searchState.selectedValue = value;
        box.hidden = true;
        box.innerHTML = "";
      });
    });
  }

  handleSuggestionKeys(e, box) {
    const items = Array.from(box.querySelectorAll(".item"));
    if (e.key === "Escape") {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.searchState.activeIndex = (this.searchState.activeIndex + 1) % items.length;
      this.syncActiveItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.searchState.activeIndex = (this.searchState.activeIndex - 1 + items.length) % items.length;
      this.syncActiveItem(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = this.searchState.activeIndex;
      if (!box.hidden && items[idx]) {
        items[idx].click();
      } else {
        this.submitSearch();
      }
    }
  }

  syncActiveItem(items) {
    items.forEach((el) => el.classList.remove("active"));
    const target = items[this.searchState.activeIndex];
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ block: "nearest" });
    }
  }

  async submitSearch() {
    const input = this.elements.searchInput;
    const suggestions = this.elements.suggestions;
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    let type = this.searchState.selectedType;
    let value = this.searchState.selectedValue || raw;
    if (!type) type = raw.includes(".") ? "table" : "job";
    this.searchState.rememberQuery(type, value);
    try {
      this.panel.showStatus("Loading graph…", true);
      const data = await this.api.fetchNeighbors(type, value, this.filterState.depth);
      this.panel.showStatus("", false);
      this.graph.renderGraph(data, { centerLabel: value });
    } catch (err) {
      this.panel.showStatus("Failed to load graph", true);
      setTimeout(() => this.panel.showStatus("", false), 2000);
    } finally {
      suggestions.hidden = true;
      suggestions.innerHTML = "";
    }
  }

  bindFilters() {
    this.elements.filterType?.addEventListener("change", (e) => {
      this.filterState.type = e.target.value;
      this.graph.applyFilters();
    });
    this.elements.filterStatus?.addEventListener("change", (e) => {
      this.filterState.status = e.target.value;
      this.graph.applyFilters();
    });
    this.elements.filterDepth?.addEventListener("change", (e) => {
      const depth = parseInt(e.target.value || "1", 10);
      this.filterState.depth = Number.isNaN(depth) ? 1 : depth;
    });
  }

  bindReset() {
    this.elements.resetGraph?.addEventListener("click", () => {
      this.graph.clearSelection();
      if (this.graph.cy) {
        this.graph.cy.fit();
        this.graph.cy.center();
      }
    });
    document.getElementById("layout-horizontal")?.addEventListener("click", () => {
      this.graph.forceLayout("horizontal");
    });
    document.getElementById("layout-vertical")?.addEventListener("click", () => {
      this.graph.forceLayout("vertical");
    });
  }

  bindActions() {
    const activeNode = () => this.graph.selectionState?.node;
    this.actionButtons.focus?.addEventListener("click", () => {
      const node = activeNode();
      if (!node || !this.graph.cy) return;
      this.graph.cy.animate(
        { center: { eles: node }, zoom: Math.min(this.graph.cy.maxZoom(), Math.max(this.graph.cy.zoom(), 1.2)) },
        { duration: 350, easing: "ease-out" }
      );
    });
    this.actionButtons.expandUp?.addEventListener("click", () => {
      const node = activeNode();
      if (node) this.graph.expand(node, "upstream", this.filterState.depth);
    });
    this.actionButtons.expandDown?.addEventListener("click", () => {
      const node = activeNode();
      if (node) this.graph.expand(node, "downstream", this.filterState.depth);
    });
    this.actionButtons.expandBoth?.addEventListener("click", () => {
      const node = activeNode();
      if (node) this.graph.expand(node, "both", this.filterState.depth);
    });
    this.actionButtons.layout?.addEventListener("click", () => {
      if (this.graph.cy) {
        this.graph.cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160 }).run();
      }
    });
    this.actionButtons.highlight?.addEventListener("click", () => {
      const node = activeNode();
      if (!node) return;
      this.graph.highlightNeighborhood(node);
    });
    this.actionButtons.clear?.addEventListener("click", () => this.graph.clearSelection());
  }

  debounce(fn, delay = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }
}

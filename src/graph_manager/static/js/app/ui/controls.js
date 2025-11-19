import { SELECTORS } from "../config.js";

export class ControlBar {
  constructor({ api, graph, panel, filterState, searchState }) {
    this.api = api;
    this.graph = graph;
    this.panel = panel;
    this.filterState = filterState;
    this.searchState = searchState;
    this.searchInputBound = false;
    this.elements = {
      filterType: document.querySelector(SELECTORS.filterType),
      filterStatus: document.querySelector(SELECTORS.filterStatus),
      filterDepth: document.querySelector(SELECTORS.filterDepth),
      resetGraph: document.querySelector(SELECTORS.resetGraph),
    };
    this.toolbarButtons = {
      layout: document.getElementById("layout-reset"),
      highlight: document.getElementById("highlight-path"),
      clear: document.getElementById("clear-selection"),
    };
    this.directionControls = {
      card: document.getElementById("direction-card"),
      toggle: document.getElementById("direction-toggle"),
      body: document.getElementById("direction-body"),
      apply: document.getElementById("direction-apply"),
      labels: Array.from(document.querySelectorAll("[data-direction-option]")),
    };
    this.directionControls.inputs = this.directionControls.labels.map((label) => label.querySelector("input"));
  }

  init() {
    this.bindSearchInput();
    this.bindFilters();
    this.bindReset();
    this.bindToolbarActions();
    this.initDirectionControls();
  }

  bindSearchInput() {
    if (this.searchInputBound) return;
    const selectorInput = SELECTORS.searchInput;
    const selectorButton = SELECTORS.searchButton;
    const getSuggestions = () => document.querySelector(SELECTORS.suggestions);

    const runSuggest = this.debounce(async (inputEl) => {
      const suggestions = getSuggestions();
      if (!inputEl || !suggestions) return;
      if (!document.body.contains(inputEl)) return;
      const q = inputEl.value?.trim?.() || "";
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
        this.renderSuggestions(data, suggestions, inputEl);
      } catch (err) {
        suggestions.innerHTML = '<div class="group">No results</div>';
      }
    }, 200);

    this.searchHandlers = {
      input: (event) => {
        const target = event.target;
        if (!target || !target.matches(selectorInput)) return;
        runSuggest(target);
      },
      blur: (event) => {
        const target = event.target;
        if (!target || !target.matches(selectorInput)) return;
        setTimeout(() => {
          const box = getSuggestions();
          if (!box || box.matches(":hover")) return;
          box.hidden = true;
          box.innerHTML = "";
        }, 150);
      },
      keydown: (event) => {
        const target = event.target;
        if (!target || !target.matches(selectorInput)) return;
        this.handleSuggestionKeys(event, getSuggestions());
      },
      click: (event) => {
        if (event.target.closest(selectorButton)) {
          event.preventDefault();
          this.submitSearch();
        }
      },
    };

    document.addEventListener("input", this.searchHandlers.input);
    document.addEventListener("blur", this.searchHandlers.blur, true);
    document.addEventListener("keydown", this.searchHandlers.keydown);
    document.addEventListener("click", this.searchHandlers.click);
    this.searchInputBound = true;
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
    if (!box) return;
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
    const input = document.querySelector(SELECTORS.searchInput);
    const suggestions = document.querySelector(SELECTORS.suggestions);
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
      this.graph.renderGraph(data, { centerLabel: value, rememberInitial: true, resetViewport: true });
    } catch (err) {
      this.panel.showStatus("Failed to load graph", true);
      setTimeout(() => this.panel.showStatus("", false), 2000);
    } finally {
      if (suggestions) {
        suggestions.hidden = true;
        suggestions.innerHTML = "";
      }
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

  bindToolbarActions() {
    const activeNode = () => this.graph.selectionState?.node;
    this.toolbarButtons.layout?.addEventListener("click", () => {
      if (this.graph.cy) {
        this.graph.cy.layout({ name: "dagre", rankDir: "LR", nodeSep: 120, rankSep: 160 }).run();
      }
    });
    this.toolbarButtons.highlight?.addEventListener("click", () => {
      const node = activeNode();
      if (!node) return;
      this.graph.highlightNeighborhood(node);
    });
    this.toolbarButtons.clear?.addEventListener("click", () => this.graph.clearSelection());
  }

  initDirectionControls() {
    const dir = this.directionControls;
    if (!dir.card) return;
    const sync = () => this.syncDirectionOptions();
    dir.inputs.forEach((input) => {
      if (!input) return;
      input.addEventListener("change", (event) => {
        const target = event.target;
        if (!target.checked && this.countCheckedDirections() === 0) {
          target.checked = true;
          return;
        }
        sync();
      });
    });
    dir.apply?.addEventListener("click", () => this.applyDirectionExpansion());
    dir.toggle?.addEventListener("click", () => {
      const collapsed = dir.card.classList.toggle("collapsed");
      dir.toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
    sync();
  }

  countCheckedDirections() {
    return this.directionControls.inputs.filter((input) => input?.checked).length;
  }

  syncDirectionOptions() {
    const dir = this.directionControls;
    if (!dir.labels.length) return;
    const checkedInputs = dir.inputs.filter((input) => input?.checked);
    dir.labels.forEach((label, idx) => {
      if (!label) return;
      const input = dir.inputs[idx];
      const isChecked = Boolean(input?.checked);
      label.classList.toggle("checked", isChecked);
      label.classList.remove("locked");
      label.removeAttribute("data-tooltip");
    });
    if (checkedInputs.length === 1) {
      const single = checkedInputs[0];
      const idx = dir.inputs.indexOf(single);
      const label = dir.labels[idx];
      if (label) {
        label.classList.add("locked");
        label.setAttribute("data-tooltip", "at least one direction must be selected.");
      }
    }
  }

  getSelectedDirections() {
    const dir = this.directionControls;
    const selected = [];
    dir.labels.forEach((label, idx) => {
      const input = dir.inputs[idx];
      if (input?.checked) {
        const dirName = label.getAttribute("data-direction");
        if (dirName) selected.push(dirName);
      }
    });
    return selected;
  }

  async applyDirectionExpansion() {
    const node = this.graph.selectionState?.node;
    if (!node) {
      this.panel.showStatus("Select a node first", true);
      setTimeout(() => this.panel.showStatus("", false), 1800);
      return;
    }
    const selected = this.getSelectedDirections();
    if (!selected.length) return;
    const direction = selected.length === 2 ? "both" : selected[0];
    try {
      await this.graph.expand(node, direction, this.filterState.depth);
    } catch (err) {
      this.panel.showStatus("Failed to expand", true);
      setTimeout(() => this.panel.showStatus("", false), 2000);
    }
  }

  debounce(fn, delay = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }
}

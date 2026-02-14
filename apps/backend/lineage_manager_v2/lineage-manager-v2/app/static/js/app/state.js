export class SearchState {
  constructor() {
    this.selectedType = null;
    this.selectedValue = null;
    this.itemsCount = 0;
    this.activeIndex = -1;
    this.lastQuery = null;
  }

  setCurrent(value, type) {
    this.selectedValue = value;
    this.selectedType = type;
    this.rememberQuery(type, value);
  }

  resetActive() {
    this.selectedType = null;
    this.selectedValue = null;
    this.itemsCount = 0;
    this.activeIndex = -1;
  }

  rememberQuery(type, value) {
    this.lastQuery = { type, value };
  }
}

export class FilterState {
  constructor() {
    this.type = "all";
    this.status = "all";
    this.depth = 1;
  }

  setType(value) {
    this.type = value || "all";
  }

  setStatus(value) {
    this.status = value || "all";
  }

  setDepth(value) {
    this.depth = value ? parseInt(value, 10) : 1;
  }

  clear() {
    this.type = "all";
    this.status = "all";
    this.depth = 1;
  }
}

export class RelationState {
  constructor() {
    this.upstream = [];
    this.downstream = [];
  }

  set(upstream, downstream) {
    this.upstream = upstream || [];
    this.downstream = downstream || [];
  }

  get(kind) {
    return this[kind] || [];
  }
}

export class SelectionState {
  constructor() {
    this.selectedNode = null; // { id, type, source, label, data? }
    this.listeners = [];

    // Legacy support
    this.node = null;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Immediately invoke with current state
    if (this.selectedNode) callback(this.selectedNode);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  set(nodeData) {
    // Legacy 'node' property sync
    this.node = nodeData ? { id: () => nodeData.id, data: () => nodeData.data || {} } : null;

    this.selectedNode = nodeData;
    this.notify();
  }

  clear() {
    this.selectedNode = null;
    this.node = null;
    this.notify();
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.selectedNode);
      } catch (e) {
        console.error("SelectionState listener error:", e);
      }
    });
  }

  // Legacy getter/setter if needed by unmodified code
  get() { return this.node; }
}

export class LineageState {
  constructor() {
    this.graphData = { nodes: [], edges: [] };
    // Full lineage hierarchy data from API
    this.fullLineage = null; // { upstream: [], downstream: [] }
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  setGraphData(nodes, edges) {
    this.graphData = { nodes, edges };
    this.notify();
  }

  setFullLineage(data) {
    this.fullLineage = data;
    this.notify();
  }

  notify() {
    const state = {
      graphData: this.graphData,
      fullLineage: this.fullLineage
    };
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        console.error("LineageState listener error:", e);
      }
    });
  }
}

// Singletons for Shared State
export const selectionState = new SelectionState();
export const lineageState = new LineageState();

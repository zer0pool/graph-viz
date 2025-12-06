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
    this.node = null;
  }

  set(node) {
    this.node = node;
  }

  get() {
    return this.node;
  }

  clear() {
    this.node = null;
  }
}

export class SearchState {
  constructor() {
    this.selectedType = null;
    this.selectedValue = null;
    this.itemsCount = 0;
    this.activeIndex = -1;
    this.lastQuery = null;
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

  clear() {
    this.node = null;
  }
}

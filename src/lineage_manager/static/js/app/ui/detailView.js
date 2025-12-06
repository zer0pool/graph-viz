export class JobDetailView {
  constructor({ section, label, tabs, panels, runsBody }) {
    this.section = section;
    this.label = label;
    this.tabs = tabs;
    this.panels = panels;
    this.runsBody = runsBody;
  }

  show() {
    this.toggle(true);
  }

  hide() {
    this.toggle(false);
  }

  toggle(visible) {
    if (this.section) {
      this.section.hidden = !visible;
      this.section.style.display = visible ? "" : "none";
    }
    if (this.tabs) this.tabs.hidden = !visible;
    if (this.panels) this.panels.hidden = !visible;
  }

  setLabel(text) {
    if (this.label) this.label.textContent = text;
  }

  setPlaceholder(message = 'Select a job to view run history.') {
    this.setLabel(message.includes('Select') ? message : 'Select a node to view its details.');
    this.setRunsPlaceholder('Select "Run history" to load data.');
  }

  setRunsPlaceholder(message, loading = false) {
    if (!this.runsBody) return;
    const spinner = loading ? '<span class="spinner"></span>' : '';
    this.runsBody.innerHTML = `<tr><td class="loading-cell" colspan="6">${spinner}${message}</td></tr>`;
  }

  renderRuns(rows) {
    if (!this.runsBody) return;
    if (!rows.length) {
      this.setRunsPlaceholder('No run history available.');
      return;
    }
    this.runsBody.innerHTML = rows
      .map((entry, index) => {
        const run = entry.run_id || entry.run || `#${index + 1}`;
        const status = entry.status || '-';
        const start = entry.start_time || '-';
        const end = entry.end_time || '-';
        const duration = entry.duration_sec != null ? `${entry.duration_sec}s` : entry.duration || entry.elapsed || '-';
        const triggeredBy = entry.triggered_by || entry.source_job || '-';
        return `<tr>
          <td>${run}</td>
          <td>${status}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${duration}</td>
          <td>${triggeredBy}</td>
        </tr>`;
      })
      .join('');
  }
}

export class TableDetailView {
  constructor({
    section,
    tabs,
    panels,
    fullName,
    description,
    docLink,
    owner,
    storageSummary,
    partitionSummary,
    updated,
    storageFields,
    statsFields,
    tagsSection,
    tagsList,
    schemaCount,
    schemaBody,
    schemaEmpty,
  }) {
    this.section = section;
    this.tabs = tabs;
    this.panels = panels;
    this.fullName = fullName;
    this.description = description;
    this.docLink = docLink;
    this.owner = owner;
    this.storageSummary = storageSummary;
    this.partitionSummary = partitionSummary;
    this.updated = updated;
    this.storageFields = storageFields || {};
    this.statsFields = statsFields || {};
    this.tagsSection = tagsSection;
    this.tagsList = tagsList;
    this.schemaCount = schemaCount;
    this.schemaBody = schemaBody;
    this.schemaEmpty = schemaEmpty;

  }

  show() {
    this.toggle(true);
  }

  hide() {
    this.toggle(false);
  }

  toggle(visible) {
    if (this.section) {
      this.section.hidden = !visible;
      this.section.style.display = visible ? "" : "none";
    }
    if (this.tabs) this.tabs.hidden = !visible;
    if (this.panels) this.panels.hidden = !visible;
  }

  setDetails(payload) {
    this.reset();
    if (!payload) return;
    const { fullName, overview = {}, storage = {}, stats = {}, schema = {} } = payload;
    if (this.fullName) this.fullName.textContent = fullName || "-";
    if (this.owner) this.owner.textContent = overview.owner || "-";
    if (this.updated) this.updated.textContent = this.formatDate(overview.updated_at) || "-";
    this.renderDescription(overview);
    this.renderDocLink(overview.documentation_url);
    this.renderStorage(storage);
    this.renderStats(stats);
    this.renderTags(overview.tags || overview.labels);
    this.renderSchema(schema);
  }

  reset() {
    if (this.description) {
      this.description.textContent = "";
      this.description.hidden = true;
    }
    if (this.docLink) {
      this.docLink.hidden = true;
      this.docLink.removeAttribute("href");
    }
    if (this.owner) this.owner.textContent = "-";
    if (this.storageSummary) this.storageSummary.textContent = "-";
    if (this.partitionSummary) this.partitionSummary.textContent = "-";
    if (this.updated) this.updated.textContent = "-";
    Object.values(this.storageFields || {}).forEach((node) => {
      if (node) node.textContent = "-";
    });
    Object.values(this.statsFields || {}).forEach((node) => {
      if (node) node.textContent = "-";
    });
    if (this.tagsSection) this.tagsSection.hidden = true;
    if (this.tagsList) this.tagsList.innerHTML = "";
    if (this.schemaBody) this.schemaBody.innerHTML = "";
    if (this.schemaEmpty) this.schemaEmpty.hidden = false;
    if (this.schemaCount) this.schemaCount.textContent = "0";
  }

  renderDescription(overview) {
    if (!this.description) return;
    const text = overview.description || "";
    this.description.textContent = text;
    this.description.hidden = !text;
  }

  renderDocLink(url) {
    if (!this.docLink) return;
    if (url) {
      this.docLink.hidden = false;
      this.docLink.href = url;
    } else {
      this.docLink.hidden = true;
      this.docLink.removeAttribute("href");
    }
  }

  renderStorage(storage = {}) {
    const type = storage.type || "-";
    if (this.storageSummary) this.storageSummary.textContent = type;
    if (this.partitionSummary) this.partitionSummary.textContent = storage.partition || "-";
    if (this.storageFields.type) this.storageFields.type.textContent = type;
    if (this.storageFields.partitionField)
      this.storageFields.partitionField.textContent = storage.partition_field || storage.partition || "-";
    if (this.storageFields.partitionType)
      this.storageFields.partitionType.textContent = storage.partition_type || "-";
    if (this.storageFields.clusterColumns)
      this.storageFields.clusterColumns.textContent = this.formatClusterColumns(storage.cluster_columns);
    if (this.storageFields.location)
      this.storageFields.location.textContent = storage.location || "-";
  }

  renderStats(stats = {}) {
    if (this.statsFields.rows)
      this.statsFields.rows.textContent = this.formatNumber(stats.row_count) || "-";
    if (this.statsFields.size)
      this.statsFields.size.textContent = this.formatBytes(stats.size_bytes) || "-";
    if (this.statsFields.cost)
      this.statsFields.cost.textContent = this.formatCurrency(stats.storage_cost) || "-";
  }

  renderTags(source) {
    if (!this.tagsSection || !this.tagsList) return;
    const entries = this.normalizeEntries(source);
    if (!entries.length) {
      this.tagsSection.hidden = true;
      this.tagsList.innerHTML = "";
      return;
    }
    this.tagsList.innerHTML = "";
    entries.forEach(([key, value]) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = value != null ? `${key}: ${value}` : key;
      this.tagsList.appendChild(pill);
    });
    this.tagsSection.hidden = false;
  }

  renderSchema(schema = {}) {
    const columns = Array.isArray(schema.columns) ? schema.columns : [];
    if (this.schemaCount) this.schemaCount.textContent = String(columns.length);
    if (!this.schemaBody || !this.schemaEmpty) return;
    if (!columns.length) {
      this.schemaBody.innerHTML = "";
      this.schemaEmpty.hidden = false;
      return;
    }
    this.schemaEmpty.hidden = true;
    this.schemaBody.innerHTML = columns
      .map((col) => {
        const name = col.name || "-";
        const type = col.type || col.data_type || "-";
        const mode = col.mode || col.nullable || "-";
        const desc = col.description || col.comment || "";
        return `<tr>
          <td>${name}</td>
          <td>${type}</td>
          <td>${mode}</td>
          <td>${desc || ""}</td>
        </tr>`;
      })
      .join("");
  }

  normalizeEntries(source) {
    if (!source) return [];
    if (Array.isArray(source)) {
      return source
        .map((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) return [entry[0], entry[1]];
          if (entry && typeof entry === "object") {
            return [entry.key ?? entry.name ?? entry.label, entry.value ?? entry.text];
          }
          return null;
        })
        .filter((pair) => pair && pair[0]);
    }
    if (typeof source === "object") {
      return Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== "");
    }
    return [];
  }

  formatClusterColumns(columns) {
    if (!columns) return "-";
    if (Array.isArray(columns)) return columns.length ? columns.join(", ") : "-";
    if (typeof columns === "string") return columns;
    return "-";
  }

  formatNumber(value) {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return num.toLocaleString();
  }

  formatBytes(value) {
    if (value === undefined || value === null) return "";
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(num) / Math.log(1024)));
    const scaled = num / 1024 ** idx;
    return `${scaled.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  }

  formatCurrency(value) {
    if (value === undefined || value === null || value === "") return "";
    const num = Number(value);
    if (Number.isNaN(num)) return String(value);
    return `$${num.toFixed(2)}`;
  }

  formatDate(value) {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toISOString().split("T")[0];
    } catch (err) {
      return value;
    }
  }
}

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
    owner,
    storage,
    partition,
    createdOverview,
    labelsSection,
    labelsList,
    overviewMetaSection,
    overviewMetaList,
    schemaValue,
    rows,
    createdSchema,
  }) {
    this.section = section;
    this.tabs = tabs;
    this.panels = panels;
    this.fullName = fullName;
    this.owner = owner;
    this.storage = storage;
    this.partition = partition;
    this.createdOverview = createdOverview;
    this.labelsSection = labelsSection;
    this.labelsList = labelsList;
    this.overviewMetaSection = overviewMetaSection;
    this.overviewMetaList = overviewMetaList;
    this.schemaValue = schemaValue;
    this.rows = rows;
    this.createdSchema = createdSchema;
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

  setMetadata({
    fullName,
    owner,
    storage,
    partition,
    createdOverview,
    labels,
    overviewMeta,
    schema,
    rows,
    createdSchema,
  }) {
    if (this.fullName) this.fullName.textContent = fullName || '-';
    if (this.owner) this.owner.textContent = owner || '-';
    if (this.storage) this.storage.textContent = storage || '-';
    if (this.partition) this.partition.textContent = partition || '-';
    if (this.createdOverview) this.createdOverview.textContent = createdOverview || '-';
    if (this.schemaValue) this.schemaValue.textContent = schema || '-';
    if (this.rows) this.rows.textContent = rows || '-';
    if (this.createdSchema) this.createdSchema.textContent = createdSchema || '-';
    this.renderLabels(labels);
    this.renderOverviewMeta(overviewMeta);
  }

  renderLabels(source) {
    if (!this.labelsSection || !this.labelsList) return;
    const entries = this.normalizeEntries(source);
    if (!entries.length) {
      this.labelsSection.hidden = true;
      this.labelsList.innerHTML = '';
      return;
    }
    this.labelsList.innerHTML = '';
    entries.forEach(([key, value]) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = `${key}: ${value}`;
      this.labelsList.appendChild(pill);
    });
    this.labelsSection.hidden = false;
  }

  renderOverviewMeta(source) {
    if (!this.overviewMetaSection || !this.overviewMetaList) return;
    const entries = this.normalizeEntries(source);
    if (!entries.length) {
      this.overviewMetaSection.hidden = true;
      this.overviewMetaList.innerHTML = '';
      return;
    }
    this.overviewMetaList.innerHTML = '';
    entries.forEach(([key, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = this.formatKey(key);
      const dd = document.createElement('dd');
      dd.textContent = value;
      this.overviewMetaList.append(dt, dd);
    });
    this.overviewMetaSection.hidden = false;
  }

  normalizeEntries(source) {
    if (!source) return [];
    if (Array.isArray(source)) {
      return source
        .map((entry) => {
          if (Array.isArray(entry) && entry.length >= 2) return [entry[0], entry[1]];
          if (entry && typeof entry === 'object') {
            return [entry.key ?? entry.name, entry.value ?? entry.label ?? entry.text];
          }
          return null;
        })
        .filter((pair) => pair && pair[0] != null && pair[1] != null);
    }
    if (typeof source === 'object') {
      return Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== '');
    }
    return [];
  }

  formatKey(key) {
    if (!key) return '';
    const text = key.replace(/[_-]/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

}

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
    schema,
    rows,
    created,
    loadsBody,
  }) {
    this.section = section;
    this.tabs = tabs;
    this.panels = panels;
    this.fullName = fullName;
    this.schema = schema;
    this.rows = rows;
    this.created = created;
    this.loadsBody = loadsBody;
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

  setMetadata({ fullName, schema, rows, created }) {
    if (this.fullName) this.fullName.textContent = fullName || '-';
    if (this.schema) this.schema.textContent = schema || '-';
    if (this.rows) this.rows.textContent = rows || '-';
    if (this.created) this.created.textContent = created || '-';
  }

  setLoadPlaceholder(message, loading = false) {
    if (!this.loadsBody) return;
    const spinner = loading ? '<span class="spinner"></span>' : '';
    this.loadsBody.innerHTML = `<tr><td class="loading-cell" colspan="7">${spinner}${message}</td></tr>`;
  }

  renderLoadHistory(rows) {
    if (!this.loadsBody) return;
    if (!rows.length) {
      this.setLoadPlaceholder('No load history available.');
      return;
    }
    this.loadsBody.innerHTML = rows
      .map((entry, index) => {
        const run = entry.run_id || entry.run || `#${index + 1}`;
        const status = entry.status || '-';
        const duration = entry.duration_sec != null ? `${entry.duration_sec}s` : entry.duration || entry.elapsed || '-';
        const updated = entry.updated_at || entry.completed_at || '-';
        const start = entry.data_interval_start || '-';
        const end = entry.data_interval_end || '-';
        const interval = entry.interval || '-';
        return `<tr>
          <td>${run}</td>
          <td>${status}</td>
          <td>${duration}</td>
          <td>${updated}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${interval}</td>
        </tr>`;
      })
      .join('');
  }
}

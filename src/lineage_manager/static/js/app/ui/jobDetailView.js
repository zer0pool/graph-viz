/**
 * JobDetailView - Render job run history and metadata
 * Extracted from detailView.js, focused on job-specific UI (~50 lines)
 */

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

    setRunsPlaceholder(message, loading = false) {
        if (!this.runsBody) return;
        const spinner = loading ? '<span class="spinner"></span>' : '';
        this.runsBody.innerHTML = `<tr><td class="loading-cell" colspan="6">${spinner}${message}</td></tr>`;
    }

    renderRuns(rows) {
        if (!this.runsBody) return;
        if (!rows.length) {
            this.setRunsPlaceholder("No run history available.");
            return;
        }

        this.runsBody.innerHTML = rows
            .map((entry, index) => {
                const run = entry.run_id || entry.run || `#${index + 1}`;
                const status = entry.status || "-";
                const start = entry.start_time || "-";
                const end = entry.end_time || "-";
                const duration =
                    entry.duration_sec != null
                        ? `${entry.duration_sec}s`
                        : entry.duration || entry.elapsed || "-";
                const triggeredBy = entry.triggered_by || entry.source_job || "-";

                return `<tr>
          <td>${run}</td>
          <td>${status}</td>
          <td>${start}</td>
          <td>${end}</td>
          <td>${duration}</td>
          <td>${triggeredBy}</td>
        </tr>`;
            })
            .join("");
    }
}

export default JobDetailView;

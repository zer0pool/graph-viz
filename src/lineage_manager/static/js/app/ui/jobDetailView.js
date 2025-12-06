/**
 * JobDetailView - Render job overview, run history, and lineage summaries
 */

export class JobDetailView {
    constructor({
        section,
        label,
        tabs,
        panels,
        runsBody,
        overviewPlaceholder,
        overviewContent,
        overviewFields = {},
        inputList,
        outputList,
        lineagePlaceholder,
        lineageContent,
        lineageInputs,
        lineageOutputs,
    }) {
        this.section = section;
        this.label = label;
        this.tabs = tabs;
        this.panels = panels;
        this.runsBody = runsBody;

        this.overviewPlaceholder = overviewPlaceholder;
        this.overviewContent = overviewContent;
        this.overviewFields = overviewFields;
        this.inputList = inputList;
        this.outputList = outputList;

        this.lineagePlaceholder = lineagePlaceholder;
        this.lineageContent = lineageContent;
        this.lineageInputs = lineageInputs;
        this.lineageOutputs = lineageOutputs;

        this.collapseState = {};
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

    reset() {
        this.collapseState = {};
        this.setOverviewPlaceholder("Select a job to load overview.");
        this.renderIOLinks([], []);
        this.setLineagePlaceholder('Select "Lineage" to view related tables.');
        this.setRunsPlaceholder('Select "Run history" to load data.');
    }

    setLabel(text, visible = true) {
        if (!this.label) return;
        this.label.textContent = text || "";
        this.label.hidden = !visible;
    }

    setOverviewPlaceholder(message) {
        if (this.overviewPlaceholder) {
            this.overviewPlaceholder.textContent = message;
            this.overviewPlaceholder.hidden = false;
        }
        if (this.overviewContent) this.overviewContent.hidden = true;
    }

    setOverviewLoading(message = "Loading job details…") {
        this.setOverviewPlaceholder(message);
    }

    setOverviewError(message = "Failed to load job details.") {
        this.setOverviewPlaceholder(message);
    }

    renderOverview(detail = {}) {
        if (!this.overviewContent) return;
        if (this.overviewPlaceholder) this.overviewPlaceholder.hidden = true;
        this.overviewContent.hidden = false;

        const fields = this.overviewFields || {};
        this.setField(fields.status, detail.status || "-");
        this.setField(fields.schedule, detail.schedule || "-");
        this.setField(fields.owner, detail.owner || "-");
        this.setField(fields.destination, detail.destination || "-");
        this.setField(fields.mode, detail.write_mode || "-");
    }

    setField(node, value) {
        if (node) node.textContent = value ?? "-";
    }

    renderIOLinks(inputs = [], outputs = []) {
        this.renderList(this.inputList, inputs, "No input tables detected.", "overview_inputs");
        this.renderList(this.outputList, outputs, "No output tables detected.", "overview_outputs");
    }

    setLineagePlaceholder(message) {
        if (this.lineagePlaceholder) {
            this.lineagePlaceholder.textContent = message;
            this.lineagePlaceholder.hidden = false;
        }
        if (this.lineageContent) this.lineageContent.hidden = true;
    }

    renderLineageSummary(inputs = [], outputs = []) {
        if (!this.lineageContent) return;
        if (!inputs.length && !outputs.length) {
            this.setLineagePlaceholder("No lineage information available.");
            return;
        }
        if (this.lineagePlaceholder) this.lineagePlaceholder.hidden = true;
        this.lineageContent.hidden = false;
        this.renderList(this.lineageInputs, inputs, "No input tables detected.", "lineage_inputs");
        this.renderList(this.lineageOutputs, outputs, "No output tables detected.", "lineage_outputs");
    }

    renderList(target, items = [], emptyText = "No items", key, collapsible = true) {
        if (!target) return;
        if (!items.length) {
            target.innerHTML = `<li class="empty">${emptyText}</li>`;
            return;
        }

        const threshold = 3;
        const isCollapsible = collapsible && items.length > threshold;
        const expanded = this.collapseState[key] || false;
        const visibleItems = !isCollapsible || expanded ? items : items.slice(0, threshold);

        target.innerHTML = visibleItems
            .map((entry) => {
                const item = typeof entry === "string" ? { label: entry } : entry || {};
                const primary = this.extractPrimaryLabel(item);
                const secondary = this.extractSecondaryLabel(item, primary);
                const meta = secondary ? `<div class="secondary">${secondary}</div>` : "";
                return `<li>
                    <div class="primary">${primary}</div>
                    ${meta}
                </li>`;
            })
            .join("");

        if (isCollapsible) {
            const remaining = items.length - threshold;
            const label = expanded ? "Hide tables" : `+ ${remaining} more tables…`;
            const toggle = document.createElement("li");
            toggle.className = "io-toggle";
            toggle.innerHTML = `<button type="button">${label}</button>`;
            toggle.querySelector("button").addEventListener("click", () => {
                this.collapseState[key] = !expanded;
                this.renderList(target, items, emptyText, key, collapsible);
            });
            target.appendChild(toggle);
        }
    }

    extractPrimaryLabel(item = {}) {
        if (item.type === "s3") {
            return item.label || item.name || item.path || "-";
        }
        return item.full_name || item.label || item.name || "-";
    }

    extractSecondaryLabel(item = {}, primary) {
        const location =
            item.location ||
            item.storage_path ||
            item.external_path ||
            item.path ||
            null;
        if (location && location !== primary) {
            return location;
        }
        return null;
    }

    setRunsPlaceholder(message, loading = false) {
        if (!this.runsBody) return;
        const spinner = loading ? '<span class="spinner"></span>' : "";
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

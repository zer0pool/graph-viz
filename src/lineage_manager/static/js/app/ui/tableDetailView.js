/**
 * TableDetailView - Render table metadata, storage, stats, schema
 * Extracted from detailView.js, focused on table-specific UI (~200 lines)
 */

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

    /**
     * Set table details from payload
     */
    setDetails(payload) {
        this.reset();
        if (!payload) return;

        const {
            fullName,
            overview = {},
            storage = {},
            stats = {},
            schema = {},
        } = payload;

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

    /**
     * Reset all fields
     */
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

    /**
     * Render description
     */
    renderDescription(overview) {
        if (!this.description) return;
        const text = overview.description || "";
        this.description.textContent = text;
        this.description.hidden = !text;
    }

    /**
     * Render documentation link
     */
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

    /**
     * Render storage information
     */
    renderStorage(storage = {}) {
        const type = storage.type || "-";

        if (this.storageSummary) this.storageSummary.textContent = type;
        if (this.partitionSummary)
            this.partitionSummary.textContent = storage.partition || "-";

        if (this.storageFields.type)
            this.storageFields.type.textContent = type;
        if (this.storageFields.partitionField)
            this.storageFields.partitionField.textContent =
                storage.partition_field || storage.partition || "-";
        if (this.storageFields.partitionType)
            this.storageFields.partitionType.textContent = storage.partition_type || "-";
        if (this.storageFields.clusterColumns)
            this.storageFields.clusterColumns.textContent = this.formatClusterColumns(
                storage.cluster_columns
            );
        if (this.storageFields.location)
            this.storageFields.location.textContent = storage.location || "-";
    }

    /**
     * Render statistics
     */
    renderStats(stats = {}) {
        if (this.statsFields.rows)
            this.statsFields.rows.textContent = this.formatNumber(stats.row_count) || "-";
        if (this.statsFields.size)
            this.statsFields.size.textContent = this.formatBytes(stats.size_bytes) || "-";
        if (this.statsFields.cost)
            this.statsFields.cost.textContent = this.formatCurrency(stats.storage_cost) || "-";
    }

    /**
     * Render tags/labels
     */
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

    /**
     * Render schema columns
     */
    renderSchema(schema = {}) {
        const columns = Array.isArray(schema.columns) ? schema.columns : [];

        // Walk nested RECORD fields and produce a flat list with depth for indentation
        const rows = [];
        const walk = (cols, prefix = "", depth = 0) => {
            cols.forEach((col) => {
                const colName = col.name || "-";
                const displayName = prefix ? `${prefix}.${colName}` : colName;
                const type = col.type || col.data_type || "-";
                const mode = col.mode || col.nullable || "-";
                const desc = col.description || col.comment || "";
                rows.push({ name: displayName, type, mode, desc, depth });

                // If nested RECORD/RECORD type, recurse into fields
                const isRecord = String(type).toUpperCase() === "RECORD" || String(type).toUpperCase() === "STRUCT";
                if (isRecord && Array.isArray(col.fields) && col.fields.length) {
                    walk(col.fields, displayName, depth + 1);
                }
            });
        };

        walk(columns);

        if (this.schemaCount) this.schemaCount.textContent = String(rows.length);

        if (!this.schemaBody || !this.schemaEmpty) return;

        if (!rows.length) {
            this.schemaBody.innerHTML = "";
            this.schemaEmpty.hidden = false;
            return;
        }

        this.schemaEmpty.hidden = true;
        this.schemaBody.innerHTML = rows
            .map((col) => {
                const indent = col.depth ? `style="padding-left:${col.depth * 14}px"` : "";
                const name = col.name || "-";
                const type = col.type || "-";
                const mode = col.mode || "-";
                const desc = col.desc || "";

                return `<tr>
          <td ${indent}>${name}</td>
          <td>${type}</td>
          <td>${mode}</td>
          <td>${desc || ""}</td>
        </tr>`;
            })
            .join("");
    }

    /**
     * Normalize tag/label entries
     */
    normalizeEntries(source) {
        if (!source) return [];

        if (Array.isArray(source)) {
            return source
                .map((entry) => {
                    if (Array.isArray(entry) && entry.length >= 2)
                        return [entry[0], entry[1]];
                    if (entry && typeof entry === "object") {
                        return [
                            entry.key ?? entry.name ?? entry.label,
                            entry.value ?? entry.text,
                        ];
                    }
                    return null;
                })
                .filter((pair) => pair && pair[0]);
        }

        if (typeof source === "object") {
            return Object.entries(source).filter(
                ([, value]) => value !== undefined && value !== null && value !== ""
            );
        }

        return [];
    }

    // Formatting utilities

    formatClusterColumns(columns) {
        if (!columns) return "-";
        if (Array.isArray(columns))
            return columns.length ? columns.join(", ") : "-";
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
        const idx = Math.min(
            units.length - 1,
            Math.floor(Math.log(num) / Math.log(1024))
        );
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

export default TableDetailView;

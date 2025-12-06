/**
 * SearchControl - Handle search input and suggestions
 * Extracted from ControlBar (~100 lines)
 */

import { SELECTORS } from "../config.js";

const GROUP_ORDER = [
    { key: "tables", title: "Tables", icon: "T" },
    { key: "jobs", title: "Jobs", icon: "J" },
    { key: "owners", title: "Owners", icon: "O" },
];

export class SearchControl {
    constructor(api, searchState, onSelectCallback) {
        this.api = api;
        this.searchState = searchState;
        this.onSelect = onSelectCallback;
        this.input = document.querySelector(SELECTORS.searchInput);
        this.button = document.querySelector(SELECTORS.searchButton);
        this.suggestions = document.querySelector(SELECTORS.suggestions);
        this.currentItems = [];
    }

    init() {
        if (!this.input || !this.suggestions) return;

        const runSuggest = this.debounce(async (inputEl) => {
            const q = inputEl.value?.trim?.() || "";
            this.searchState.resetActive();

            if (!q) {
                this.suggestions.hidden = true;
                this.suggestions.innerHTML = "";
                return;
            }

            this.showSuggestions('<div class="group"><div class="group-title">Searching…</div></div>');

            try {
                const data = await this.api.fetchSuggestions(q);
                this.renderSuggestions(data);
            } catch (err) {
                console.error("Suggestion fetch failed:", err);
                this.renderNoResults();
            }
        }, 200);

        this.input.addEventListener("input", (event) => runSuggest(event.target));
        this.input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.hideSuggestions();
                this.input.blur();
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                this.button?.click();
            }
        });
        this.input.addEventListener("blur", () => {
            setTimeout(() => {
                if (!this.suggestions.matches(":hover")) {
                    this.hideSuggestions();
                }
            }, 100);
        });

        document.addEventListener("click", (event) => {
            if (
                event.target === this.input ||
                this.suggestions.contains(event.target)
            ) {
                return;
            }
            this.hideSuggestions();
        });

        // Search button click handler
        if (this.button) {
            this.button.addEventListener("click", async () => {
                const label = this.input.value?.trim?.();
                if (!label) return;

                const existing =
                    this.findItemByDisplay(label) || this.findItemByValue(label);
                if (existing) {
                    this.completeSelection(existing.value, existing.type, existing.meta);
                    return;
                }

                try {
                    const data = await this.api.fetchSuggestions(label);
                    const { flatItems } = this.normalizeSuggestions(data);
                    const lowered = label.toLowerCase();
                    const bestMatch =
                        flatItems.find(
                            (item) =>
                                item.display?.toLowerCase() === lowered ||
                                item.value?.toLowerCase() === lowered
                        ) || flatItems[0];

                    if (bestMatch) {
                        this.completeSelection(
                            bestMatch.value,
                            bestMatch.type,
                            bestMatch.meta
                        );
                    } else {
                        this.hideSuggestions();
                    }
                } catch (err) {
                    console.error("Search error:", err);
                }
            });
        }

        this.suggestions.addEventListener("mousedown", (event) => {
            const item = event.target.closest("[data-label]");
            if (!item) return;
            const label = item.dataset.label;
            const type = item.dataset.type;
            const meta = this.findItemByValue(label, type)?.meta || {
                ownerName: item.dataset.owner,
                sampleJobId: item.dataset.sampleJob,
            };
            this.completeSelection(label, type, meta);
        });
    }

    renderSuggestions(data) {
        if (!this.suggestions) return;
        const { sections, flatItems } = this.normalizeSuggestions(data);
        this.currentItems = flatItems;
        this.searchState.itemsCount = flatItems.length;

        if (!sections.length) {
            this.renderNoResults();
            return;
        }

        const html = sections
            .map((section) => {
                const itemsHtml = section.items
                    .map((item) => this.renderItem(item))
                    .join("");
                return `<div class="group"><div class="group-title">${section.title}</div>${itemsHtml}</div>`;
            })
            .join("");

        this.showSuggestions(html);
    }

    renderNoResults() {
        this.currentItems = [];
        this.showSuggestions(
            '<div class="group empty"><div class="group-title">No results</div></div>'
        );
    }

    renderItem(item) {
        const attrs = [
            `data-label="${this.escapeAttr(item.value)}"`,
            `data-type="${item.type}"`,
        ];
        if (item.meta?.ownerName) {
            attrs.push(`data-owner="${this.escapeAttr(item.meta.ownerName)}"`);
        }
        if (item.meta?.sampleJobId) {
            attrs.push(
                `data-sample-job="${this.escapeAttr(item.meta.sampleJobId)}"`
            );
        }

        const secondary = item.secondary
            ? `<div class="secondary">${this.escapeHtml(item.secondary)}</div>`
            : "";

        return `<div class="item" ${attrs.join(" ")}>
            <span class="icon">${item.icon}</span>
            <div class="item-text">
                <div class="primary">${this.escapeHtml(item.display)}</div>
                ${secondary}
            </div>
        </div>`;
    }

    showSuggestions(html) {
        this.suggestions.hidden = false;
        this.suggestions.innerHTML = html;
    }

    hideSuggestions() {
        this.suggestions.hidden = true;
        this.suggestions.innerHTML = "";
    }

    normalizeSuggestions(data) {
        const sections = [];
        const flatItems = [];

        GROUP_ORDER.forEach((group) => {
            const rawItems = data?.[group.key] || [];
            if (!rawItems.length) return;

            const formatted = rawItems.map((raw) => {
                if (group.key === "tables") {
                    const secondary = raw.project && raw.dataset
                        ? `${raw.project}.${raw.dataset}`
                        : raw.dataset || raw.project || null;
                    const item = {
                        group: group.key,
                        value: raw.full_name,
                        display: raw.full_name,
                        secondary: secondary || null,
                        type: "table",
                        icon: group.icon,
                        meta: {},
                    };
                    flatItems.push(item);
                    return item;
                }

                if (group.key === "jobs") {
                    const displayName = raw.name || raw.job_id;
                    const secondary = raw.owner || raw.job_id;
                    const item = {
                        group: group.key,
                        value: raw.job_id,
                        display: displayName,
                        secondary,
                        type: "job",
                        icon: group.icon,
                        meta: { ownerName: raw.owner },
                    };
                    flatItems.push(item);
                    return item;
                }

                if (group.key === "owners") {
                    const item = {
                        group: group.key,
                        value: raw.name,
                        display: raw.name,
                        secondary: raw.sample_job_id
                            ? `Sample job: ${raw.sample_job_id}`
                            : null,
                        type: "owner",
                        icon: group.icon,
                        meta: {
                            ownerName: raw.name,
                            sampleJobId: raw.sample_job_id,
                        },
                    };
                    flatItems.push(item);
                    return item;
                }

                return null;
            }).filter(Boolean);

            if (formatted.length) {
                sections.push({
                    key: group.key,
                    title: group.title,
                    items: formatted,
                });
            }
        });

        return { sections, flatItems };
    }

    findItemByValue(value, type) {
        if (!value) return null;
        const lowered = value.toLowerCase();
        return this.currentItems.find(
            (item) =>
                item.value?.toLowerCase() === lowered &&
                (type ? item.type === type : true)
        );
    }

    findItemByDisplay(display) {
        if (!display) return null;
        const lowered = display.toLowerCase();
        return this.currentItems.find(
            (item) => item.display?.toLowerCase() === lowered
        );
    }

    completeSelection(label, type, meta = {}) {
        this.input.value = "";
        this.hideSuggestions();
        if (
            this.searchState &&
            typeof this.searchState.setCurrent === "function"
        ) {
            this.searchState.setCurrent(label, type);
        }
        if (this.onSelect) this.onSelect(label, type, meta);
    }

    escapeHtml(value = "") {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    escapeAttr(value = "") {
        return this.escapeHtml(value);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

export default SearchControl;

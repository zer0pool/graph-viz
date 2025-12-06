/**
 * SearchControl - Handle search input and suggestions
 * Extracted from ControlBar (~100 lines)
 */

import { SELECTORS } from "../config.js";

export class SearchControl {
    constructor(api, searchState, onSelectCallback) {
        this.api = api;
        this.searchState = searchState;
        this.onSelect = onSelectCallback;
        this.input = document.querySelector(SELECTORS.searchInput);
        this.button = document.querySelector(SELECTORS.searchButton);
        this.suggestions = document.querySelector(SELECTORS.suggestions);
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

            this.suggestions.hidden = false;
            this.suggestions.innerHTML = '<div class="loading">Loading…</div>';

            try {
                const data = await this.api.fetchSuggestions(q);
                this.renderSuggestions(data);
            } catch (err) {
                this.suggestions.innerHTML = '<div class="group">No results</div>';
            }
        }, 200);

        this.input.addEventListener("input", (event) => runSuggest(event.target));
        this.input.addEventListener("blur", () => {
            setTimeout(() => {
                if (!this.suggestions.matches(":hover")) {
                    this.suggestions.hidden = true;
                }
            }, 100);
        });

        // Search button click handler
        if (this.button) {
            this.button.addEventListener("click", async () => {
                const label = this.input.value?.trim?.();
                if (!label) return;

                // Get suggestions to find the type
                try {
                    const data = await this.api.fetchSuggestions(label);
                    const allItems = [
                        ...(data.jobs || []).map(j => ({
                            label: j.job_id || j.name,
                            type: "job"
                        })),
                        ...(data.tables || []).map(t => ({
                            label: t.table_name || t.full_name,
                            type: "table"
                        }))
                    ];

                    const match = allItems.find(item => item.label === label);
                    const type = match?.type || "job";

                    this.input.value = "";
                    this.suggestions.hidden = true;
                    if (this.searchState && typeof this.searchState.setCurrent === "function") {
                        this.searchState.setCurrent(label, type);
                    }
                    if (this.onSelect) this.onSelect(label, type);
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
            this.input.value = "";
            this.suggestions.hidden = true;
            if (this.searchState && typeof this.searchState.setCurrent === "function") {
                this.searchState.setCurrent(label, type);
            }
            if (this.onSelect) this.onSelect(label, type);
        });
    }

    renderSuggestions(data) {
        if (!this.suggestions) return;

        const groups = {};
        (data.jobs || []).forEach((job) => {
            if (!groups.jobs) groups.jobs = [];
            groups.jobs.push({ label: job.job_id || job.name, type: "job", icon: "J" });
        });
        (data.tables || []).forEach((tbl) => {
            if (!groups.tables) groups.tables = [];
            groups.tables.push({
                label: tbl.table_name || tbl.full_name,
                type: "table",
                icon: "T",
            });
        });

        const html = Object.entries(groups)
            .map(([groupType, items]) => {
                const groupLabel = groupType === "jobs" ? "Jobs" : "Tables";
                const itemsHtml = items
                    .map(
                        (item) =>
                            `<div class="item" data-label="${item.label}" data-type="${item.type}">
              <span class="icon">${item.icon}</span>
              <span>${item.label}</span>
            </div>`
                    )
                    .join("");
                return `<div class="group"><div class="group-title">${groupLabel}</div>${itemsHtml}</div>`;
            })
            .join("");

        this.suggestions.innerHTML = html;
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

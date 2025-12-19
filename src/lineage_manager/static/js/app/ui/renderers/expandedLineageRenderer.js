import { LineageTreeUtils } from "../../utils/lineageTreeUtils.js";

/**
 * Responsible for rendering the "Full Lineage" hierarchical table view.
 * Handles cards, tree structures, pagination/truncation, and total counts.
 */
export class ExpandedLineageRenderer {
    constructor(callbacks = {}) {
        this.onSelectNode = callbacks.onSelectNode || (() => { });
        this.currentRootName = null;
    }

    render(container, data, elements, selectedNode = null) {
        // Determine Root Node Name (depth === 0)
        let rootName = null;
        const findRoot = (list) => list ? list.find(item => item.depth === 0) : null;
        const rootItem = findRoot(data.upstream) || findRoot(data.downstream);
        if (rootItem) {
            rootName = rootItem.id;
        }

        this.currentRootName = rootName;

        // UI Header Updates
        if (elements.fullTitle) {
            elements.fullTitle.innerHTML = rootName
                ? `Full Lineage — <span class="param-chip">${rootName}</span>`
                : "Full Lineage";
        }
        if (elements.fullNotice) {
            elements.fullNotice.hidden = !!rootName;
            if (!rootName) elements.fullNotice.textContent = "Select a table to view lineage.";
        }
        if (elements.downloadFullBtn) {
            elements.downloadFullBtn.disabled = !rootName;
        }

        container.innerHTML = "";

        if (data.upstream && data.upstream.length > 0) {
            const c = LineageTreeUtils.getCounts(data.upstream);
            container.appendChild(this._createApaTable(`Upstream (${c.t} tables / ${c.j} jobs)`, "Created By Job", data.upstream, selectedNode));
        }

        if (data.downstream && data.downstream.length > 0) {
            const c = LineageTreeUtils.getCounts(data.downstream);
            container.appendChild(this._createApaTable(`Downstream (${c.t} tables / ${c.j} jobs)`, "Used By Job", data.downstream, selectedNode));
        }

        if ((!data.upstream || data.upstream.length === 0) && (!data.downstream || data.downstream.length === 0)) {
            container.innerHTML = '<div class="empty-state">No lineage data available.</div>';
        }

        this._appendGlobalFooter(container);

        // Remove blur with a slight delay to trigger transition
        if (container.classList.contains("blur-loading")) {
            setTimeout(() => {
                container.classList.remove("blur-loading");
            }, 200);
        }
    }

    _createApaTable(directionLabel, jobColHeader, items, selectedNode) {
        const card = document.createElement("div");
        card.className = "lineage-card";

        const body = document.createElement("div");
        body.className = "lineage-card-body apa-container";

        // Use LineageTreeUtils to build the tree structure
        const tableItems = LineageTreeUtils.buildFlatTree(items);

        const titleDiv = document.createElement("div");
        titleDiv.className = "apa-table-label";
        titleDiv.textContent = directionLabel;
        body.appendChild(titleDiv);

        const table = document.createElement("table");
        table.className = "apa-table";

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Table Name</th>
                <th>${jobColHeader}</th>
                <th style="width: 60px;">Depth</th>
                <th>Owner</th>
                <th>Info</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);
        body.appendChild(table);
        card.appendChild(body);

        const MAX_VISIBLE_ITEMS = 20;

        const renderItemsBatch = (itemsToRender) => {
            const fragment = document.createDocumentFragment();
            itemsToRender.forEach(item => {
                fragment.appendChild(this._createRow(item, items, selectedNode));
            });
            tbody.appendChild(fragment);
        };

        const appendFooter = (isTruncated = false) => {
            const c = LineageTreeUtils.getCounts(items);
            const countText = isTruncated
                ? `Showing ${MAX_VISIBLE_ITEMS} of ${c.t} tables • Total Jobs: ${c.j}`
                : `Total — Tables: ${c.t} • Jobs: ${c.j}`;

            const totalTr = document.createElement("tr");
            totalTr.className = "apa-total-row";
            totalTr.innerHTML = `
                <td colspan="5" style="text-align: right; padding-right: 12px; color: #444; font-weight: 600;">
                    ${countText}
                </td>
            `;
            tbody.appendChild(totalTr);
        };

        const visibleItems = tableItems.slice(0, MAX_VISIBLE_ITEMS);
        renderItemsBatch(visibleItems);

        if (tableItems.length > MAX_VISIBLE_ITEMS) {
            const omissionTr = document.createElement("tr");
            omissionTr.className = "omission-row";
            omissionTr.innerHTML = `
                <td colspan="5" class="omission-cell">
                    <div class="omission-content">
                        <div class="omission-dots">• • •</div>
                        <div class="omission-label">Middle items hidden</div>
                        <button class="omission-btn">Show all (+${tableItems.length - MAX_VISIBLE_ITEMS})</button>
                    </div>
                </td>
            `;

            omissionTr.querySelector("button").addEventListener("click", () => {
                omissionTr.remove();
                const currentFooter = tbody.querySelector(".apa-total-row");
                if (currentFooter) currentFooter.remove();

                const restItems = tableItems.slice(MAX_VISIBLE_ITEMS);
                renderItemsBatch(restItems);
                appendFooter(false);
            });

            tbody.appendChild(omissionTr);
            appendFooter(true);
        } else {
            appendFooter(false);
        }

        return card;
    }

    _createRow(item, originalItems, selectedNode) {
        const tr = document.createElement("tr");
        tr.dataset.id = item.id;
        tr.dataset.type = item.type.toLowerCase();
        tr.dataset.label = item.name;

        const tProps = item.properties || {};
        const owner = tProps.owner || "-";
        const info = tProps.description || tProps.table_type || "-";
        tr.dataset.props = encodeURIComponent(JSON.stringify(tProps));

        const logicalDepth = Math.floor(item.depth / 2);
        let jobName = "-";
        let jobStatusPill = "";

        if (item.parent) {
            const parentNode = originalItems.find(p => p.id === item.parent || p.name === item.parent);
            if (parentNode && parentNode.type === "job") {
                jobName = parentNode.name;
                const jProps = parentNode.properties || {};
                const status = jProps.status || jProps.run_status || "unknown";
                jobStatusPill = `<span class="status-pill status-${status.toLowerCase()}">${status}</span>`;
            }
        }

        const selectedId = selectedNode ? (typeof selectedNode.id === 'function' ? selectedNode.id() : selectedNode.id) : null;
        if (selectedId === item.id) {
            tr.classList.add("selected");
        }
        if (item.depth === 0) tr.classList.add("depth-root-row");

        let nameHtml = `<span class="node-label-text">${item.id}</span>`;
        if (item.depth === 0) {
            nameHtml = `<span class="root-table-badge">${item.id}</span>`;
        }

        // Tree Prefix - Helper to map characters to CSS-based continuous lines
        const renderPrefixHtml = (prefixStr) => {
            if (!prefixStr) return '';
            const chunks = [];
            // Each tree level is 2 characters (e.g., "│ ", "└ ", "  ")
            for (let i = 0; i < prefixStr.length; i += 2) {
                chunks.push(prefixStr.substring(i, i + 2));
            }

            return `<div class="tree-line-container">` +
                chunks.map(chunk => {
                    let className = "tree-line-cell";
                    if (chunk.startsWith('│')) className += " tree-line-v";
                    else if (chunk.startsWith('├')) className += " tree-line-t";
                    else if (chunk.startsWith('└')) className += " tree-line-l";

                    return `<span class="${className}"></span>`;
                }).join('') +
                `</div>`;
        };

        const prefixHtml = item.depth === 0 ? '' : renderPrefixHtml(item.treePrefix);

        tr.innerHTML = `
            <td title="${item.name}">
                <div class="node-label-container">
                    ${prefixHtml}
                    ${nameHtml}
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${jobName}</span>
                    ${jobStatusPill}
                </div>
            </td>
            <td>${logicalDepth}</td>
            <td>${owner}</td>
            <td>${info}</td>
        `;

        return tr;
    }

    _appendGlobalFooter(container) {
        const footer = document.createElement("div");
        footer.className = "lineage-footer-note";
        const dateStr = new Date().toISOString().split('T')[0];
        footer.innerHTML = `
            <div class="footer-separator"></div>
            <span>Note: Generated from analysis at ${dateStr}.</span>
        `;
        container.appendChild(footer);
    }
}

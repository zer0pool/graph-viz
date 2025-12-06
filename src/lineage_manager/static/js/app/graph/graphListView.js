/**
 * GraphListView - List/table view rendering
 * Handles switching between graph and list views, CSV export
 */

export class GraphListView {
    constructor(graphView, graphContainer, listView) {
        this.view = graphView;
        this.graphCanvas = graphContainer;
        this.listView = listView;
        this.listTableBody = listView?.querySelector("tbody");
        this.listDownloadBtn = document.getElementById("list-download");
        this.listRows = [];
        this.listDownloadBound = false;
        this.viewMode = "graph";
    }

    /**
     * Set current view mode
     */
    setViewMode(mode = "graph") {
        this.viewMode = mode === "list" ? "list" : "graph";
        if (this.graphCanvas) {
            this.graphCanvas.hidden = this.viewMode === "list";
        }
        if (this.listView) {
            this.listView.hidden = this.viewMode !== "list";
        }
        if (this.viewMode === "graph" && this.view.getCy()) {
            this.view.resize();
        }
    }

    /**
     * Get current view mode
     */
    getViewMode() {
        return this.viewMode;
    }

    /**
     * Update list view with current graph nodes
     */
    updateListView() {
        if (!this.listTableBody) return;

        const cy = this.view.getCy();
        if (!cy) {
            this.listTableBody.innerHTML = "";
            this.listRows = [];
            return;
        }

        const rows = cy
            .nodes()
            .map((node) => {
                const data = node.data();
                return {
                    name: data.label || node.id(),
                    type: (data.type || "job").toUpperCase(),
                    owner: data.owner || "-",
                    updated: data.updated_at || data.updated || "-",
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        this.listRows = rows;

        if (!rows.length) {
            this.listTableBody.innerHTML =
                '<tr><td colspan="4">No nodes in view.</td></tr>';
            return;
        }

        this.listTableBody.innerHTML = rows
            .map(
                (row) => `<tr>
          <td>${row.name}</td>
          <td>${row.type}</td>
          <td>${row.owner}</td>
          <td>${row.updated}</td>
        </tr>`
            )
            .join("");
    }

    /**
     * Setup download button
     */
    bindListDownload() {
        if (this.listDownloadBound || !this.listDownloadBtn) return;
        this.listDownloadBtn.addEventListener("click", () => this.downloadList());
        this.listDownloadBound = true;
    }

    /**
     * Download nodes as CSV
     */
    downloadList() {
        if (!this.listRows.length) {
            alert("No nodes to download.");
            return;
        }

        const header = ["Name", "Type", "Owner", "Updated"];
        const csvRows = [header.join(",")].concat(
            this.listRows.map((row) =>
                [row.name, row.type, row.owner, row.updated]
                    .map((cell) =>
                        `"${String(cell ?? "").replace(/"/g, '""')}"`
                    )
                    .join(",")
            )
        );

        const blob = new Blob([csvRows.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "lineage-nodes.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get list rows
     */
    getRows() {
        return this.listRows;
    }
}

export default GraphListView;

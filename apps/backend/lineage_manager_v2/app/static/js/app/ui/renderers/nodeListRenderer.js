/**
 * Responsible for rendering the simple flat list of nodes for "Current View".
 */
export class NodeListRenderer {
    constructor() {
        this.nodeDataMap = new Map();
    }

    render(tbody, nodes, selectedNode = null) {
        if (!nodes) return;

        tbody.innerHTML = "";
        this.nodeDataMap.clear();

        // Sort by label or ID
        const sorted = [...nodes].sort((a, b) => {
            const na = a.data?.label || a.data?.id || "";
            const nb = b.data?.label || b.data?.id || "";
            return na.localeCompare(nb);
        });

        const selectedId = selectedNode ?
            (typeof selectedNode.id === 'function' ? selectedNode.id() : selectedNode.id)
            : null;

        sorted.forEach(node => {
            const data = node.data;
            if (!data || data.id === "visual_anchor") return; // Skip dummy

            this.nodeDataMap.set(data.id, data);

            const tr = document.createElement("tr");
            tr.dataset.id = data.id;
            tr.dataset.type = data.type; // job or table

            if (selectedId === data.id) {
                tr.classList.add("selected");
            }

            const nameTd = document.createElement("td");
            nameTd.textContent = data.label || data.id;

            const typeTd = document.createElement("td");
            typeTd.innerHTML = `<span class="badge ${data.type.toLowerCase()}">${data.type}</span>`;

            const ownerTd = document.createElement("td");
            ownerTd.textContent = data.owner || "-";

            const updatedTd = document.createElement("td");
            updatedTd.textContent = "-";

            tr.append(nameTd, typeTd, ownerTd, updatedTd);
            tbody.append(tr);
        });

        return this.nodeDataMap;
    }
}

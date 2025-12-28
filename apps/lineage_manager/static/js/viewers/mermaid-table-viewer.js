/**
 * Expandable Table-Only Lineage Viewer
 * 
 * Manages graph state (nodes/edges) and provides "Expansion" UX.
 * Renderer Wrapper Pattern: State Change -> DSL Regen -> mermaid.run()
 */

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    flowchart: {
        curve: 'basis'
    },
    themeVariables: {
        primaryColor: '#e8f5e9',
        primaryTextColor: '#34a853',
        lineColor: '#dadce0',
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: '14px'
    }
});

// Graph State
let state = {
    nodes: {}, // id -> { name, expandedUp, expandedDown }
    edges: [], // List of { from, to }
    selectedId: null
};

async function initViewer() {
    const params = new URLSearchParams(window.location.search);
    const tableName = params.get('table_name');

    if (!tableName) {
        showError("Missing table_name parameter in URL.");
        return;
    }

    document.getElementById('root-table-name').textContent = tableName;

    // Initial state: root node
    state.nodes[tableName] = { name: tableName, expandedUp: false, expandedDown: false };

    // Wire UI events
    document.getElementById('btn-expand-up').onclick = () => expand('upstream');
    document.getElementById('btn-expand-down').onclick = () => expand('downstream');
    document.getElementById('btn-reset').onclick = () => resetToSelected();

    // Initial Render
    await render();

    try {
        // Automatically expand initial 1-level down for better first look
        await expand('downstream', tableName, true);
    } catch (err) {
        console.warn("Initial expansion failed, but showing root node:", err);
    } finally {
        hideLoading();
    }
}

/**
 * Expand logic
 * @param {string} direction 'upstream' | 'downstream'
 * @param {string} targetId Optional target node to expand, defaults to selected
 */
async function expand(direction, targetId = state.selectedId, isSilent = false) {
    if (!targetId) return;

    if (!isSilent) showLoading();

    try {
        // Use the Neighbors API with level=2 to get Table -> Job -> Table connections in one hop
        const response = await fetch(`/api/v1/graph/table/${targetId}/neighbors?level=2&direction=${direction}`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        const data = await response.json();
        const newNodes = data.nodes || [];
        const newEdges = data.edges || [];

        // Add all nodes to state
        newNodes.forEach(n => {
            const key = n.full_name || n.job_id || n.id;
            if (!state.nodes[key]) {
                state.nodes[key] = {
                    id: n.id,
                    name: key,
                    type: n.type,
                    expandedUp: false,
                    expandedDown: false
                };
            }
        });

        // Add all edges as they are (no collapsing)
        newEdges.forEach(e => {
            const sourceNode = newNodes.find(n => n.id === e.source);
            const targetNode = newNodes.find(n => n.id === e.target);

            if (sourceNode && targetNode) {
                const from = sourceNode.full_name || sourceNode.job_id || sourceNode.id;
                const to = targetNode.full_name || targetNode.job_id || targetNode.id;

                if (!state.edges.find(edge => edge.from === from && edge.to === to)) {
                    state.edges.push({ from, to });
                }
            }
        });

        // Ensure target is in nodes (it should be) and has its type
        if (!state.nodes[targetId]) {
            // This case should ideally not happen if targetId is a valid node in the graph
            // but as a fallback, initialize it as a table.
            state.nodes[targetId] = { id: targetId, name: targetId, type: 'table', expandedUp: false, expandedDown: false };
        }


        if (direction === 'upstream') state.nodes[targetId].expandedUp = true;
        else if (direction === 'downstream') state.nodes[targetId].expandedDown = true;
        else if (direction === 'both') {
            state.nodes[targetId].expandedUp = true;
            state.nodes[targetId].expandedDown = true;
        }

        await render();
    } catch (err) {
        if (!isSilent) showError("Expansion failed: " + err.message);
    } finally {
        if (!isSilent) hideLoading();
    }
}

async function resetToSelected() {
    if (!state.selectedId) return;
    const newRoot = state.selectedId;
    state = {
        nodes: { [newRoot]: { name: newRoot, expandedUp: false, expandedDown: false } },
        edges: [],
        selectedId: newRoot
    };
    document.getElementById('root-table-name').textContent = newRoot;
    await render();
    document.getElementById('selection-panel').style.display = 'none';
}

const LIMIT = 5;

async function render() {
    const dsl = generateDSL();
    const container = document.getElementById('mermaid-graph');

    try {
        const id = 'mermaid_' + Math.floor(Math.random() * 1000000);
        const { svg } = await mermaid.render(id, dsl);
        container.innerHTML = svg;

        setupNodeClicks();
    } catch (err) {
        console.error("Mermaid Render Error:", err);
        container.innerHTML = `<div class="error-panel"><p>Render Error: ${err.message}</p></div>`;
    }
}

function generateDSL() {
    const lines = ['flowchart LR'];
    lines.push('  classDef table fill:#f8f9fa,stroke:#dadce0,rx:6,ry:6');
    lines.push('  classDef job fill:#fff4e5,stroke:#ffab40,rx:6,ry:6');
    lines.push('  classDef more fill:#f8f9fa,stroke:#dadce0,stroke-dasharray: 5 5,rx:6,ry:6');
    lines.push('  classDef selected stroke:#1a73e8,stroke-width:3.5px');

    function sanitizeId(id) {
        return "id_" + id.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    const rootId = document.getElementById('root-table-name').textContent;
    const hideEdges = new Set();
    const aggregateNodes = []; // { id, label, from, to }

    // 1. Determine which edges to hide and create aggregate nodes
    Object.keys(state.nodes).forEach(nodeId => {
        const outEdges = state.edges.filter(e => e.from === nodeId);
        if (outEdges.length > LIMIT) {
            outEdges.slice(LIMIT).forEach(e => hideEdges.add(`${e.from}->${e.to}`));
            aggregateNodes.push({
                id: `more_down_${nodeId}`,
                label: `+ ${outEdges.length - LIMIT} more`,
                from: nodeId,
                to: `more_down_${nodeId}`
            });
        }

        const inEdges = state.edges.filter(e => e.to === nodeId);
        if (inEdges.length > LIMIT) {
            inEdges.slice(LIMIT).forEach(e => hideEdges.add(`${e.from}->${e.to}`));
            aggregateNodes.push({
                id: `more_up_${nodeId}`,
                label: `+ ${inEdges.length - LIMIT} more`,
                from: `more_up_${nodeId}`,
                to: nodeId
            });
        }
    });

    // 2. Identify visible nodes and edges
    const visibleEdges = state.edges.filter(e => !hideEdges.has(`${e.from}->${e.to}`));
    const visibleNodeIds = new Set();
    visibleNodeIds.add(rootId);
    if (state.selectedId) visibleNodeIds.add(state.selectedId);

    visibleEdges.forEach(e => {
        visibleNodeIds.add(e.from);
        visibleNodeIds.add(e.to);
    });

    // 3. Render Nodes
    visibleNodeIds.forEach(id => {
        const sId = sanitizeId(id);
        const node = state.nodes[id];
        if (!node) return;

        const label = id.split('.').pop();
        const className = node.type === 'job' ? 'job' : 'table';
        lines.push(`  ${sId}["${label}"]:::${className}`);
    });

    // 4. Render Aggregate Nodes
    aggregateNodes.forEach(an => {
        const sAnId = sanitizeId(an.id);
        lines.push(`  ${sAnId}["${an.label}"]:::more`);
        lines.push(`  ${sanitizeId(an.from)} --> ${sanitizeId(an.to)}`);
    });

    // 5. Render Visible Edges
    visibleEdges.forEach(e => {
        lines.push(`  ${sanitizeId(e.from)} --> ${sanitizeId(e.to)}`);
    });

    if (state.selectedId && visibleNodeIds.has(state.selectedId)) {
        lines.push(`  ${sanitizeId(state.selectedId)}:::selected`);
    }

    lines.push('  linkStyle default stroke:#dadce0,stroke-width:1px');
    return lines.join('\n');
}

function setupNodeClicks() {
    const container = document.getElementById('mermaid-graph');
    // Find all 'g.node' elements generated by Mermaid
    const nodes = container.querySelectorAll('g.node');

    nodes.forEach(node => {
        const sanitizedId = node.id.split('-')[1]; // Mermaid's generated ID is often like "id_...-depth"

        node.style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
            e.preventDefault();

            // Find the original ID from state
            const originalId = Object.keys(state.nodes).find(id => {
                const sId = "id_" + id.replace(/[^a-zA-Z0-9_]/g, '_');
                return node.id.includes(sId); // Safer check
            });

            if (originalId) {
                selectNode(originalId);
            }
        });
    });
}

function selectNode(id) {
    state.selectedId = id;

    // Update Panel
    const panel = document.getElementById('selection-panel');
    const title = document.getElementById('panel-title');
    title.textContent = id;
    panel.style.display = 'block';

    // Disable buttons if already expanded
    document.getElementById('btn-expand-up').disabled = state.nodes[id].expandedUp;
    document.getElementById('btn-expand-down').disabled = state.nodes[id].expandedDown;

    // Refresh graph to show highlight
    render();
}

/** Error Handling & UI Utils **/
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }
function showError(msg) {
    hideLoading();
    const el = document.getElementById('error-message');
    document.getElementById('error-text').textContent = msg;
    el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initViewer);

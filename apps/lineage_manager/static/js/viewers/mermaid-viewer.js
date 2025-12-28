/**
 * mermaid-viewer.js
 * Enhanced Lineage Viewer using Mermaid.js with Expand functionality
 */

// Mermaid DSL Generator (inline to avoid module issues)
function toMermaidId(nodeId) {
    const [type, ...rest] = nodeId.split(':');
    const prefix = type === 'job' ? 'J' : 'T';
    const sanitized = rest.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
    return `${prefix}_${sanitized}`;
}

function generateMermaidDSL(graphData, selectedNodeId = null) {
    const { nodes, edges } = graphData;

    const nodeLines = new Set();
    const edgeLines = [];

    // Generate nodes
    nodes.forEach(node => {
        const mermaidId = toMermaidId(node.id);
        const nodeClass = node.type === 'job' ? 'job' : 'table';
        const label = node.label || node.id;
        nodeLines.add(`  ${mermaidId}["${label}"]:::${nodeClass}`);
    });

    // Generate edges
    edges.forEach(edge => {
        const sourceId = toMermaidId(edge.source);
        const targetId = toMermaidId(edge.target);
        const label = edge.type || '';

        if (label) {
            edgeLines.push(`  ${sourceId} -->|${label}| ${targetId}`);
        } else {
            edgeLines.push(`  ${sourceId} --> ${targetId}`);
        }
    });

    // Build DSL
    const lines = [
        'flowchart LR',
        '  classDef job fill:#e3f2fd,stroke:#1a73e8,rx:6,ry:6',
        '  classDef table fill:#e8f5e9,stroke:#34a853,rx:6,ry:6',
        '  classDef selected stroke:#1a73e8,stroke-width:3.5px',
        ...Array.from(nodeLines),
        ...edgeLines
    ];

    // Apply selection style
    if (selectedNodeId) {
        const selectedMermaidId = toMermaidId(selectedNodeId);
        lines.push(`  ${selectedMermaidId}:::selected`);
    }

    lines.push('  linkStyle default stroke:#dadce0,stroke-width:1px');

    return lines.join('\n');
}

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    flowchart: {
        curve: 'basis'
    },
    themeVariables: {
        background: '#ffffff',
        primaryColor: '#e3f2fd',
        primaryBorderColor: '#1a73e8',
        primaryTextColor: '#202124',
        lineColor: '#dadce0',
        secondaryColor: '#e8f5e9',
        secondaryBorderColor: '#34a853',
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: '14px'
    }
});

// Viewer State
const viewerState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    expandedNodes: new Set(),
    rootNodeId: null,
    depth: 1,
    maxNodes: 30
};

// Initialize viewer
async function initViewer() {
    const params = new URLSearchParams(window.location.search);
    const nodeId = params.get('node_id') || params.get('job_id');

    if (!nodeId) {
        showError("Missing node_id parameter in URL");
        return;
    }

    viewerState.rootNodeId = nodeId.includes(':') ? nodeId : `job:${nodeId}`;
    viewerState.selectedNodeId = viewerState.rootNodeId;

    await loadInitialGraph();
}

// Load initial graph
async function loadInitialGraph() {
    showLoading();

    try {
        const response = await fetch(
            `/api/v1/lineage/graph?node_id=${encodeURIComponent(viewerState.rootNodeId)}&depth=1`
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        viewerState.nodes = data.nodes || [];
        viewerState.edges = data.edges || [];

        renderGraph();
        updateNavbar();

    } catch (err) {
        showError(`Failed to load graph: ${err.message}`);
    } finally {
        hideLoading();
    }
}

// Expand node
async function expandNode(direction) {
    if (!viewerState.selectedNodeId) {
        alert('Please select a node first');
        return;
    }

    showLoading();

    try {
        const response = await fetch(
            `/api/v1/lineage/graph?node_id=${encodeURIComponent(viewerState.selectedNodeId)}&direction=${direction}&depth=1`
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        mergeGraphData(data);
        viewerState.expandedNodes.add(viewerState.selectedNodeId);

        renderGraph();
        updateNavbar();

    } catch (err) {
        showError(`Expansion failed: ${err.message}`);
    } finally {
        hideLoading();
    }
}

// Merge graph data
function mergeGraphData(newData) {
    const existingIds = new Set(viewerState.nodes.map(n => n.id));
    const newNodes = (newData.nodes || []).filter(n => !existingIds.has(n.id));
    viewerState.nodes.push(...newNodes);

    const existingEdges = new Set(
        viewerState.edges.map(e => `${e.source}->${e.target}`)
    );
    const newEdges = (newData.edges || []).filter(
        e => !existingEdges.has(`${e.source}->${e.target}`)
    );
    viewerState.edges.push(...newEdges);
}

// Reset view
async function resetView() {
    viewerState.nodes = [];
    viewerState.edges = [];
    viewerState.expandedNodes.clear();
    viewerState.selectedNodeId = viewerState.rootNodeId;

    await loadInitialGraph();
}

// Render graph
function renderGraph() {
    const dsl = generateMermaidDSL(
        {
            nodes: viewerState.nodes,
            edges: viewerState.edges
        },
        viewerState.selectedNodeId
    );

    console.log('Generated DSL:', dsl);
    renderMermaid(dsl);
}

// Render Mermaid
async function renderMermaid(dsl) {
    const container = document.getElementById('mermaid-graph');

    if (!container) {
        console.error('Mermaid container not found');
        return;
    }

    // Clear and set content
    container.innerHTML = '';
    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.textContent = dsl;
    container.appendChild(mermaidDiv);

    try {
        await mermaid.run({
            nodes: [mermaidDiv],
            suppressErrors: false
        });

        console.log('Mermaid rendered successfully');
        attachNodeClickHandlers();
    } catch (err) {
        console.error('Mermaid render error:', err);
        showError(`Rendering failed: ${err.message}`);
    }
}

// Attach click handlers
function attachNodeClickHandlers() {
    const nodes = document.querySelectorAll('.node');
    nodes.forEach(node => {
        node.style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
            const nodeText = node.textContent;
            const matchingNode = viewerState.nodes.find(n =>
                n.label === nodeText || n.id.includes(nodeText)
            );

            if (matchingNode) {
                selectNode(matchingNode.id);
            }
        });
    });
}

// Select node
function selectNode(nodeId) {
    viewerState.selectedNodeId = nodeId;
    updateNavbar();
    renderGraph();
}

// Update navbar
function updateNavbar() {
    const selectedNode = viewerState.nodes.find(
        n => n.id === viewerState.selectedNodeId
    );

    const label = selectedNode ? selectedNode.label : 'No selection';
    const labelElement = document.getElementById('selected-node-label');
    if (labelElement) {
        labelElement.textContent = label;
    }

    const hasSelection = !!viewerState.selectedNodeId;
    const upstreamBtn = document.getElementById('expand-upstream');
    const downstreamBtn = document.getElementById('expand-downstream');

    if (upstreamBtn) upstreamBtn.disabled = !hasSelection;
    if (downstreamBtn) downstreamBtn.disabled = !hasSelection;
}

// Show/hide loading
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// Show error
function showError(msg) {
    const errDiv = document.getElementById('error');
    if (errDiv) {
        const msgP = errDiv.querySelector('.error-message');
        if (msgP) msgP.textContent = msg;
        errDiv.style.display = 'block';
    }
    hideLoading();
    console.error('Viewer error:', msg);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const upstreamBtn = document.getElementById('expand-upstream');
    const downstreamBtn = document.getElementById('expand-downstream');
    const resetBtn = document.getElementById('reset-view');

    if (upstreamBtn) {
        upstreamBtn.addEventListener('click', () => expandNode('upstream'));
    }

    if (downstreamBtn) {
        downstreamBtn.addEventListener('click', () => expandNode('downstream'));
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetView);
    }

    initViewer();
});

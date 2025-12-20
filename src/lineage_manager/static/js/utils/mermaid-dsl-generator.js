/**
 * Mermaid DSL Generator
 * Converts Graph API response to Mermaid DSL for lineage visualization
 */

export const MERMAID_STYLES = {
    job: {
        fill: '#e3f2fd',
        stroke: '#1a73e8',
        shape: 'rectangle'
    },
    table: {
        fill: '#e8f5e9',
        stroke: '#34a853',
        shape: 'rectangle'
    },
    selected: {
        strokeWidth: '3.5px',
        stroke: '#1a73e8'
    },
    more: {
        fill: '#f8f9fa',
        stroke: '#dadce0',
        strokeDasharray: '5 5'
    }
};

export const EDGE_LABELS = {
    'writes': 'writes',
    'reads': 'reads',
    'depends_on': 'depends on'
};

/**
 * Convert node ID to Mermaid-safe ID
 * @param {string} nodeId - "job:xxx" or "table:xxx"
 * @returns {string} - "J_xxx" or "T_xxx"
 */
export function toMermaidId(nodeId) {
    const [type, ...rest] = nodeId.split(':');
    const prefix = type === 'job' ? 'J' : 'T';
    const sanitized = rest.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
    return `${prefix}_${sanitized}`;
}

/**
 * Generate Mermaid DSL from graph data
 * @param {Object} graphData - {nodes, edges, metadata}
 * @param {string} selectedNodeId - Currently selected node
 * @returns {string} - Mermaid DSL
 */
export function generateMermaidDSL(graphData, selectedNodeId = null) {
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
        const label = EDGE_LABELS[edge.type] || '';

        if (label) {
            edgeLines.push(`  ${sourceId} -->|${label}| ${targetId}`);
        } else {
            edgeLines.push(`  ${sourceId} --> ${targetId}`);
        }
    });

    // Build DSL
    const lines = [
        'graph LR',
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

/**
 * Extract node ID from Mermaid rendered element
 * @param {HTMLElement} element - Mermaid node element
 * @returns {string|null} - Original node ID or null
 */
export function extractNodeIdFromElement(element) {
    // Mermaid adds IDs to nodes, try to extract original ID
    const mermaidId = element.id || element.getAttribute('data-id');
    if (!mermaidId) return null;

    // Convert back from Mermaid ID to original format
    // J_xxx -> job:xxx, T_xxx -> table:xxx
    if (mermaidId.startsWith('J_')) {
        const name = mermaidId.substring(2).replace(/_/g, '.');
        return `job:${name}`;
    } else if (mermaidId.startsWith('T_')) {
        const name = mermaidId.substring(2).replace(/_/g, '.');
        return `table:${name}`;
    }

    return null;
}

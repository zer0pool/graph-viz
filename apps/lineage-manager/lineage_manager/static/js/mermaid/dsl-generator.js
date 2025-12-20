/**
 * Mermaid DSL Generator
 * Converts Graph API response to Mermaid DSL
 * Separated from rendering logic for better modularity
 */

export const NODE_STYLES = {
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
    }
};

export const EDGE_LABELS = {
    'writes': 'writes',
    'reads': 'reads',
    'depends_on': 'depends on',
    'related': ''
};

/**
 * Convert node ID to Mermaid-safe ID
 * @param {string} nodeId - "job:xxx" or "table:xxx"
 * @returns {string} - "J_xxx" or "T_xxx"
 */
export function toMermaidId(nodeId) {
    if (!nodeId || typeof nodeId !== 'string') {
        return 'UNKNOWN';
    }

    const [type, ...rest] = nodeId.split(':');
    let prefix = 'T';
    if (type === 'job') prefix = 'J';
    if (type === 'placeholder') prefix = 'P';

    const sanitized = rest.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
    return `${prefix}_${sanitized}`;
}

/**
 * Escape label for Mermaid
 * @param {string} label - Raw label
 * @returns {string} - Escaped label
 */
function escapeLabel(label) {
    if (!label) return '';
    return label.replace(/"/g, '#quot;');
}

/**
 * Generate Mermaid DSL from graph data
 * @param {Object} graphData - {nodes, edges, metadata}
 * @param {string} selectedNodeId - Currently selected node
 * @returns {string} - Mermaid DSL
 */
export function generateMermaidDSL(graphData, selectedNodeId = null) {
    if (!graphData || !graphData.nodes) {
        throw new Error('Invalid graph data: nodes array is required');
    }

    const { nodes, edges = [] } = graphData;

    const nodeLines = new Set();
    const edgeLines = [];

    // Generate nodes
    nodes.forEach(node => {
        if (!node.id || !node.type) {
            console.warn('Skipping invalid node:', node);
            return;
        }

        const mermaidId = toMermaidId(node.id);
        const nodeClass = node.type === 'placeholder' ? 'placeholder' : (node.type === 'job' ? 'job' : 'table');
        const label = escapeLabel(node.label || node.id);

        // Use different bracket for placeholder if desired, e.g., ([label])
        if (node.type === 'placeholder') {
            nodeLines.add(`  ${mermaidId}(["${label}"]):::${nodeClass}`);
        } else {
            nodeLines.add(`  ${mermaidId}["${label}"]:::${nodeClass}`);
        }
    });

    // Generate edges
    edges.forEach(edge => {
        if (!edge.source || !edge.target) {
            console.warn('Skipping invalid edge:', edge);
            return;
        }

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
        '  classDef placeholder fill:#f5f5f5,stroke:#999,rx:20,ry:20',
        '  classDef selected stroke:#1a73e8,stroke-width:3.5px',
        ...Array.from(nodeLines),
        ...edgeLines
    ];

    // Apply selection style
    if (selectedNodeId) {
        const selectedMermaidId = toMermaidId(selectedNodeId);
        lines.push(`  class ${selectedMermaidId} selected`);
    }

    lines.push('  linkStyle default stroke:#666666,stroke-width:2px');

    return lines.join('\n');
}

/**
 * Validate graph data structure
 * @param {Object} graphData - Graph data to validate
 * @returns {boolean} - True if valid
 */
export function validateGraphData(graphData) {
    if (!graphData) return false;
    if (!Array.isArray(graphData.nodes)) return false;
    if (graphData.nodes.length === 0) return false;

    // Check if all nodes have required fields
    return graphData.nodes.every(node =>
        node.id && node.type && (node.type === 'job' || node.type === 'table')
    );
}

/**
 * graphUtils.js - Pure utility functions for graph processing
 */

export function getFoldedGraph({
    nodes,
    edges,
    focusNodeId,
    selectedNodeId,
    hiddenNodeIds = new Set(),
    expansionLimits
}) {
    // Pivot folding around focusNodeId, or selectedNodeId if focus is missing
    const pivotId = focusNodeId || selectedNodeId;
    if (!pivotId) return { visibleNodes: nodes, visibleEdges: edges };

    // Filter out hidden nodes first
    const effectiveNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));

    // Also exclude edges connected to hidden nodes
    const effectiveEdges = edges.filter(e =>
        !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)
    );

    const upstreamNodes = [];
    const downstreamNodes = [];
    const otherNodes = []; // Nodes not directly connected to pivot

    const visibleNodeIds = new Set();

    // Always include center node/pivot (unless hidden, but usually we don't hide the pivot)
    const pivotNode = effectiveNodes.find(n => n.id === pivotId);
    if (pivotNode && !hiddenNodeIds.has(pivotId)) {
        otherNodes.push(pivotNode);
        visibleNodeIds.add(pivotId);
    }

    // Sort nodes by their relationship to the PIVOT
    effectiveNodes.forEach(node => {
        if (node.id === pivotId) return;

        const isUpstream = effectiveEdges.some(e => e.source === node.id && e.target === pivotId);
        const isDownstream = effectiveEdges.some(e => e.source === pivotId && e.target === node.id);

        if (isUpstream) upstreamNodes.push(node);
        else if (isDownstream) downstreamNodes.push(node);
        else {
            otherNodes.push(node);
            visibleNodeIds.add(node.id);
        }
    });

    const foldedNodes = [...otherNodes];

    // Apply upstream limits to PIVOT neighbors
    const upLimit = expansionLimits.upstream;

    // Ensure selectedNode is included in visible set if it's an upstream neighbor
    let upVisible = upstreamNodes.slice(0, upLimit);
    if (selectedNodeId && upstreamNodes.some(n => n.id === selectedNodeId)) {
        if (!upVisible.some(n => n.id === selectedNodeId)) {
            // It's hidden but selected! Add it to the visible list
            const selNode = upstreamNodes.find(n => n.id === selectedNodeId);
            upVisible.push(selNode);
        }
    }

    foldedNodes.push(...upVisible);
    upVisible.forEach(n => visibleNodeIds.add(n.id));

    if (upstreamNodes.length > upLimit) {
        const moreCount = upstreamNodes.length - upVisible.length;
        if (moreCount > 0) {
            const phId = 'placeholder:upstream';
            foldedNodes.push({
                id: phId,
                type: 'placeholder',
                label: `...+${moreCount} more`
            });
        }
    }

    // Apply downstream limits to PIVOT neighbors
    const downLimit = expansionLimits.downstream;
    let downVisible = downstreamNodes.slice(0, downLimit);
    if (selectedNodeId && downstreamNodes.some(n => n.id === selectedNodeId)) {
        if (!downVisible.some(n => n.id === selectedNodeId)) {
            const selNode = downstreamNodes.find(n => n.id === selectedNodeId);
            downVisible.push(selNode);
        }
    }

    foldedNodes.push(...downVisible);
    downVisible.forEach(n => visibleNodeIds.add(n.id));

    if (downstreamNodes.length > downLimit) {
        const moreCount = downstreamNodes.length - downVisible.length;
        if (moreCount > 0) {
            const phId = 'placeholder:downstream';
            foldedNodes.push({
                id: phId,
                type: 'placeholder',
                label: `...+${moreCount} more`
            });
        }
    }

    // Filter edges: only keep those where both source and target are visible
    const foldedEdges = [];

    // 1. Keep original edges between visible nodes
    edges.forEach(edge => {
        if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
            foldedEdges.push(edge);
        }
    });

    // 2. Add specific edges for PIVOT's placeholders
    if (upstreamNodes.length > upLimit) {
        foldedEdges.push({ source: 'placeholder:upstream', target: pivotId, type: 'reads' });
    }
    if (downstreamNodes.length > downLimit) {
        foldedEdges.push({ source: pivotId, target: 'placeholder:downstream', type: 'writes' });
    }

    return { visibleNodes: foldedNodes, visibleEdges: foldedEdges };
}

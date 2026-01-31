/**
 * Mermaid Search Bridge
 * Connects search functionality to Mermaid graph loading
 * Listens for search events and loads graph via MermaidGraphManager
 */

// Listen for search completion
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Bridge] DOMContentLoaded - initializing');

    // Hook into search control - prevent default and use our handler
    const loadBtn = document.getElementById('loadBtn');
    const jobIdInput = document.getElementById('jobId');

    if (loadBtn && jobIdInput) {
        // Remove existing listeners by cloning
        const newLoadBtn = loadBtn.cloneNode(true);
        loadBtn.parentNode.replaceChild(newLoadBtn, loadBtn);

        newLoadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchValue = jobIdInput.value.trim();
            if (!searchValue) return;

            console.log('[Bridge] Search initiated:', searchValue);

            // Get Mermaid manager
            const mermaidManager = window.mermaidGraphManager;
            if (!mermaidManager) {
                console.error('[Bridge] MermaidGraphManager not initialized');
                return;
            }

            // Determine node type from search value
            let nodeId;
            if (searchValue.includes(':')) {
                nodeId = searchValue;
            } else {
                const nodeType = searchValue.includes('.') ? 'table' : 'job';
                nodeId = `${nodeType}:${searchValue}`;
            }

            console.log('[Bridge] Search:', searchValue, '→ Node ID:', nodeId);

            // Load graph
            await mermaidManager.loadGraph(nodeId);
        });
        console.log('[Bridge] Search button handler attached');
    }

    // Initialize global Mermaid manager
    if (window.MermaidGraphManager && !window.mermaidGraphManager) {
        window.mermaidGraphManager = new window.MermaidGraphManager();
        console.log('[Bridge] MermaidGraphManager initialized');
    }

    // Hook expand buttons
    const expandUpstream = document.getElementById('expand-upstream');
    const expandDownstream = document.getElementById('expand-downstream');

    console.log('[Bridge] Looking for expand buttons:', {
        upstreamFound: !!expandUpstream,
        downstreamFound: !!expandDownstream
    });

    if (expandUpstream) {
        expandUpstream.addEventListener('click', async (e) => {
            console.log('[Bridge] ⬆️ Expand Upstream button clicked');
            e.preventDefault();
            e.stopPropagation();

            const manager = window.mermaidGraphManager;
            if (!manager) {
                console.error('[Bridge] MermaidGraphManager not found');
                alert('Graph manager not initialized');
                return;
            }

            console.log('[Bridge] Current selectedNodeId:', manager.selectedNodeId);
            if (!manager.selectedNodeId) {
                console.warn('[Bridge] No node selected');
                alert('Please select a node in the graph first');
                return;
            }

            console.log('[Bridge] Calling expandNode("upstream")');
            await manager.expandNode('upstream');
        });
        console.log('[Bridge] ✅ Upstream button handler attached');
    }

    if (expandDownstream) {
        expandDownstream.addEventListener('click', async (e) => {
            console.log('[Bridge] ⬇️ Expand Downstream button clicked');
            e.preventDefault();
            e.stopPropagation();

            const manager = window.mermaidGraphManager;
            if (!manager) {
                console.error('[Bridge] MermaidGraphManager not found');
                alert('Graph manager not initialized');
                return;
            }

            console.log('[Bridge] Current selectedNodeId:', manager.selectedNodeId);
            if (!manager.selectedNodeId) {
                console.warn('[Bridge] No node selected');
                alert('Please select a node in the graph first');
                return;
            }

            console.log('[Bridge] Calling expandNode("downstream")');
            await manager.expandNode('downstream');
        });
        console.log('[Bridge] ✅ Downstream button handler attached');
    }

    // Hook reset button
    const resetView = document.getElementById('reset-view');
    if (resetView) {
        resetView.addEventListener('click', () => {
            console.log('[Bridge] Reset button clicked');
            const manager = window.mermaidGraphManager;
            if (manager && manager.initialSearchSnapshot) {
                manager.loadGraph(manager.initialSearchSnapshot.nodeId);
            } else if (manager) {
                manager.reset();
            }
        });
        console.log('[Bridge] ✅ Reset button handler attached');
    }

    console.log('[Bridge] Initialization complete');
});

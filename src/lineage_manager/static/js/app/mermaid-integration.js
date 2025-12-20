/**
 * mermaid-integration.js
 * Integrates Mermaid viewer into main index.html
 * Refactored with mermaid-live-editor patterns
 */

import { renderMermaid, exportSVG, downloadSVG } from '../mermaid/renderer.js';
import { generateMermaidDSL, validateGraphData } from '../mermaid/dsl-generator.js';
import { selectionState } from './state.js';

// Mermaid Graph Manager
class MermaidGraphManager {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNodeId = null;
        this.container = document.getElementById('mermaid-graph');
    }

    async loadGraph(nodeId) {
        try {
            const url = `/api/v1/lineage/graph?node_id=${encodeURIComponent(nodeId)}&depth=1`;
            console.log('Loading graph with URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            // Validate data
            if (!validateGraphData(data)) {
                throw new Error('Invalid graph data received from API');
            }

            this.nodes = data.nodes || [];
            this.edges = data.edges || [];
            this.selectedNodeId = nodeId;

            await this.render();

            // Show toolbar after successful render
            const toolbar = document.getElementById('graph-toolbar');
            if (toolbar) {
                toolbar.hidden = false;
            }

            return { success: true };
        } catch (err) {
            console.error('Failed to load graph:', err);
            this.showError(err.message);
            return { success: false, error: err.message };
        }
    }

    async expandNode(direction) {
        if (!this.selectedNodeId) {
            console.error('No node selected for expansion');
            return;
        }

        try {
            const url = `/api/v1/lineage/graph?node_id=${encodeURIComponent(this.selectedNodeId)}&direction=${direction}&depth=1`;
            console.log('Expanding with URL:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            this.mergeGraphData(data);
            await this.render();
        } catch (err) {
            console.error('Expansion failed:', err);
            this.showError(`Expansion failed: ${err.message}`);
        }
    }

    mergeGraphData(newData) {
        const existingIds = new Set(this.nodes.map(n => n.id));
        const newNodes = (newData.nodes || []).filter(n => !existingIds.has(n.id));
        this.nodes.push(...newNodes);

        const existingEdges = new Set(
            this.edges.map(e => `${e.source}->${e.target}`)
        );
        const newEdges = (newData.edges || []).filter(
            e => !existingEdges.has(`${e.source}->${e.target}`)
        );
        this.edges.push(...newEdges);
    }

    async render() {
        if (!this.container) {
            console.error('Container not found');
            return;
        }

        try {
            const dsl = generateMermaidDSL(
                { nodes: this.nodes, edges: this.edges },
                this.selectedNodeId
            );

            const result = await renderMermaid(this.container, dsl, 'lineageGraph');

            if (result.success) {
                this.attachNodeClickHandlers();
                this.initializeZoomControls();
            } else {
                console.error('Render failed:', result.error);
            }
        } catch (err) {
            console.error('Render error:', err);
            this.showError(`Render failed: ${err.message}`);
        }
    }

    initializeZoomControls() {
        // Initialize zoom controls
        if (!window.mermaidZoomControls) {
            window.mermaidZoomControls = new window.MermaidZoomControls('#mermaid-graph');
        }
        window.mermaidZoomControls.init();

        // Bind zoom buttons
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');
        const zoomFit = document.getElementById('zoom-fit');
        const downloadBtn = document.getElementById('download-svg');

        if (zoomIn) {
            zoomIn.onclick = () => window.mermaidZoomControls.zoomIn();
        }
        if (zoomOut) {
            zoomOut.onclick = () => window.mermaidZoomControls.zoomOut();
        }
        if (zoomFit) {
            zoomFit.onclick = () => window.mermaidZoomControls.fitToView();
        }
        if (downloadBtn) {
            downloadBtn.onclick = () => {
                import('../mermaid/renderer.js').then(module => {
                    const container = document.querySelector('#mermaid-graph .mermaid');
                    if (container) {
                        module.downloadSVG(container, `lineage_graph_${new Date().getTime()}.svg`);
                    } else {
                        console.warn('No graph to download');
                    }
                });
            };
        }

        console.log('[Manager] Zoom & Download controls initialized');
    }

    attachNodeClickHandlers() {
        console.log('Attaching node click handlers...');

        // Wait a bit for Mermaid to finish rendering
        setTimeout(() => {
            const nodes = document.querySelectorAll('.node');
            console.log(`Found ${nodes.length} nodes to attach handlers`);

            nodes.forEach((nodeElement, index) => {
                nodeElement.style.cursor = 'pointer';

                // Remove existing listeners by cloning
                const newNode = nodeElement.cloneNode(true);
                nodeElement.parentNode.replaceChild(newNode, nodeElement);

                newNode.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nodeText = newNode.textContent.trim();
                    console.log(`Node clicked: "${nodeText}"`);
                    console.log('Available nodes:', this.nodes.map(n => ({ id: n.id, label: n.label })));

                    const matchingNode = this.nodes.find(n =>
                        n.label === nodeText ||
                        n.id.includes(nodeText) ||
                        nodeText.includes(n.label)
                    );

                    if (matchingNode) {
                        console.log('Matched node:', matchingNode);
                        this.selectNode(matchingNode.id);

                        // Update global selection state
                        selectionState.set({
                            id: matchingNode.id,
                            type: matchingNode.type,
                            source: 'graph',
                            label: matchingNode.label,
                            data: matchingNode
                        });

                        // Trigger detail panel update
                        window.dispatchEvent(new CustomEvent('nodeSelected', {
                            detail: { nodeId: matchingNode.id, node: matchingNode }
                        }));
                    } else {
                        console.warn('No matching node found for:', nodeText);
                    }
                });
            });

            console.log('Click handlers attached');
        }, 100); // Small delay to ensure Mermaid is done
    }

    selectNode(nodeId) {
        console.log('Selecting node:', nodeId);
        this.selectedNodeId = nodeId;

        // Re-render to show selection styling
        this.render();

        // Enable expand buttons
        const upstreamBtn = document.getElementById('expand-upstream');
        const downstreamBtn = document.getElementById('expand-downstream');
        if (upstreamBtn) upstreamBtn.disabled = false;
        if (downstreamBtn) downstreamBtn.disabled = false;

        console.log('Node selected, selectedNodeId =', this.selectedNodeId);
    }

    reset() {
        this.nodes = [];
        this.edges = [];
        this.selectedNodeId = null;
        if (this.container) {
            this.container.innerHTML = '<div class="empty-state">Search for a job or table to view lineage</div>';
        }
    }

    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="mermaid-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${message}</div>
                </div>
            `;
        }
    }

    // Export functionality
    exportSVG() {
        return exportSVG(this.container);
    }

    downloadSVG(filename) {
        downloadSVG(this.container, filename);
    }
}

// Export for use in main.js
window.MermaidGraphManager = MermaidGraphManager;

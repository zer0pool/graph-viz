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

        // History Management
        this.history = [];
        this.historyIndex = -1;
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

            // Reset history for new graph
            this.history = [];
            this.historyIndex = -1;

            await this.render();

            // Initial state
            this.pushToHistory();

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

        this.setExpandButtonsState(false);

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
            this.pushToHistory();
        } catch (err) {
            console.error('Expansion failed:', err);
            this.showError(`Expansion failed: ${err.message}`);
        } finally {
            this.setExpandButtonsState(true);
        }
    }

    async handleSmartExpand() {
        if (!this.selectedNodeId) return;

        console.log('Smart expanding for:', this.selectedNodeId);

        // 1. Analyze current connectivity
        // Check if there are ANY incoming edges to this node in the current graph
        const hasIncoming = this.edges.some(e => e.target === this.selectedNodeId);
        // Check if there are ANY outgoing edges from this node in the current graph
        const hasOutgoing = this.edges.some(e => e.source === this.selectedNodeId);

        const directions = [];

        // "If no node from previous ... then upstream"
        if (!hasIncoming) {
            directions.push('upstream');
        }

        // "If no node following ... then downstream"
        if (!hasOutgoing) {
            directions.push('downstream');
        }

        if (directions.length === 0) {
            console.log('Node appears to be connected both ways. No expansion needed.');
            return;
        }

        this.setExpandButtonsState(false);

        try {
            console.log('Expanding directions:', directions);
            // Fetch relevant directions in parallel
            const requests = directions.map(dir =>
                fetch(`/api/v1/lineage/graph?node_id=${encodeURIComponent(this.selectedNodeId)}&direction=${dir}&depth=1`)
                    .then(r => r.ok ? r.json() : { nodes: [], edges: [] })
                    .catch(e => {
                        console.warn(`Expand ${dir} failed`, e);
                        return { nodes: [], edges: [] };
                    })
            );

            const results = await Promise.all(requests);

            let hasChanges = false;
            results.forEach(data => {
                if (data.nodes && data.nodes.length > 0) {
                    this.mergeGraphData(data);
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                await this.render();
                this.pushToHistory();
            } else {
                console.log('No new neighbors found.');
            }

        } catch (err) {
            console.error('Smart expand error:', err);
            this.showError(`Expand failed: ${err.message}`);
        } finally {
            this.setExpandButtonsState(true);
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

                // Auto-fit to view on initial render
                if (window.mermaidZoomControls) {
                    window.mermaidZoomControls.fitToView();
                }
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

        const expandSmartBtn = document.getElementById('expand-smart-btn');
        if (expandSmartBtn) {
            expandSmartBtn.onclick = () => this.handleSmartExpand();
        }

        const expandUpstreamBtn = document.getElementById('expand-upstream-btn');
        if (expandUpstreamBtn) {
            expandUpstreamBtn.onclick = () => this.expandNode('upstream');
        }

        const expandDownstreamBtn = document.getElementById('expand-downstream-btn');
        if (expandDownstreamBtn) {
            expandDownstreamBtn.onclick = () => this.expandNode('downstream');
        }

        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.onclick = () => this.undo();
        }

        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.onclick = () => this.redo();
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
        this.setExpandButtonsState(true);

        console.log('Node selected, selectedNodeId =', this.selectedNodeId);
    }

    setExpandButtonsState(enabled) {
        const ids = ['expand-smart-btn', 'expand-upstream-btn', 'expand-downstream-btn'];
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = !enabled;
                btn.style.cursor = enabled ? 'pointer' : 'wait';
                if (!enabled && btn.disabled) btn.style.cursor = 'not-allowed';
                if (!enabled) btn.style.cursor = 'wait';
            }
        });
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

    // History Management
    pushToHistory() {
        // Remove any future history if we were in the middle
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Deep clone state (naive JSON approach is sufficient for this data)
        const state = {
            nodes: JSON.parse(JSON.stringify(this.nodes)),
            edges: JSON.parse(JSON.stringify(this.edges)),
            selectedNodeId: this.selectedNodeId
        };

        this.history.push(state);
        this.historyIndex++;
        this.updateHistoryButtons();
        console.log(`[History] Pushed state. Index: ${this.historyIndex}, Total: ${this.history.length}`);
    }

    async undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            await this.restoreState(this.history[this.historyIndex]);
            this.updateHistoryButtons();
            console.log(`[History] Undo to index: ${this.historyIndex}`);
        }
    }

    async redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            await this.restoreState(this.history[this.historyIndex]);
            this.updateHistoryButtons();
            console.log(`[History] Redo to index: ${this.historyIndex}`);
        }
    }

    async restoreState(state) {
        this.nodes = JSON.parse(JSON.stringify(state.nodes));
        this.edges = JSON.parse(JSON.stringify(state.edges));
        this.selectedNodeId = state.selectedNodeId;

        await this.render();
        // Restore selection UI state if needed? Render does it mostly.
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex <= 0;
        }

        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
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

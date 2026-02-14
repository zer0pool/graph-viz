/**
 * mermaid-integration.js
 * Integrates Mermaid viewer into main index.html
 * Refactored with mermaid-live-editor patterns
 */

import { renderMermaid, exportSVG, downloadSVG } from '../mermaid/renderer.js';
import { generateMermaidDSL, validateGraphData, toMermaidId } from '../mermaid/dsl-generator.js';
import { selectionState } from './state.js';
import { getFoldedGraph } from './utils/graphUtils.js';
import { BASE_URL } from './config.js'

// Mermaid Graph Manager
class MermaidGraphManager {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.selectedNodeId = null;
        this.focusNodeId = null; // Node that is the pivot for folding
        this.container = document.getElementById('mermaid-graph');

        // Expansion state for folding (maps direction -> current limit)
        this.expansionLimits = {
            upstream: 3,
            downstream: 3
        };

        // History Management
        this.history = [];
        this.historyIndex = -1;

        // Hidden nodes
        this.hiddenNodeIds = new Set();

        // Default layout renderer
        this.renderer = 'dagre';

        // Default direction
        this.direction = 'LR';

        // Expose globally for ControlBar access
        window.mermaidGraphManager = this;

        this.contextMenu = document.getElementById('node-context-menu');
        this.initContextMenu();
    }

    initContextMenu() {
        if (!this.contextMenu) return;

        const expandUpstreamBtn = document.getElementById('ctx-btn-expand-upstream');
        if (expandUpstreamBtn) {
            expandUpstreamBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.selectedNodeId) {
                    this.expandNode('upstream');
                    this.hideContextMenu();
                }
            };
        }

        const expandDownstreamBtn = document.getElementById('ctx-btn-expand-downstream');
        if (expandDownstreamBtn) {
            expandDownstreamBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.selectedNodeId) {
                    this.expandNode('downstream');
                    this.hideContextMenu();
                }
            };
        }

        const detailBtn = document.getElementById('ctx-btn-detail');
        if (detailBtn) {
            detailBtn.onclick = (e) => {
                e.stopPropagation();
                // Manually trigger the panel open event
                // The PanelController has already updated the content based on selectionState
                document.dispatchEvent(new CustomEvent('detail-panel:selection', {
                    detail: { hasSelection: true }
                }));
                this.hideContextMenu();
            };
        }

        const deleteBtn = document.getElementById('ctx-btn-delete');
        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.selectedNodeId) {
                    this.hideNode(this.selectedNodeId);
                    this.hideContextMenu();
                }
            };
        }
    }

    showContextMenu(nodeId, nodeElement) {
        if (!this.contextMenu) return;

        // Get node position relative to viewport
        const rect = nodeElement.getBoundingClientRect();

        // Calculate center top position, accounting for scroll
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Position: Top Center of Node with slight offset up
        // Note: transform: translate(-50%, -100%) in CSS handles centering and moving up
        this.contextMenu.style.top = `${rect.top + scrollTop - 10}px`;
        this.contextMenu.style.left = `${rect.left + scrollLeft + (rect.width / 2)}px`;

        this.contextMenu.hidden = false;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.hidden = true;
        }
    }

    async setLayout(renderer) {
        if (this.renderer === renderer) return;
        this.renderer = renderer;
        console.log(`[Manager] Switching layout to: ${renderer}`);
        await this.render();
    }

    async setDirection(direction) {
        if (this.direction === direction) return;
        this.direction = direction;
        console.log(`[Manager] Switching direction to: ${direction}`);
        await this.render();
    }

    async loadGraph(nodeId) {
        try {
            // Reset expansion limits and focus on new graph load
            this.expansionLimits = { upstream: 3, downstream: 3 };
            this.focusNodeId = nodeId;
            this.selectedNodeId = nodeId;
            const url = `${BASE_URL}/api/v1/lineage/graph?node_id=${encodeURIComponent(nodeId)}&depth=1`;
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

            this.history = [];
            this.historyIndex = -1;
            this.hiddenNodeIds.clear();

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
            // Update focus when expanding
            this.focusNodeId = this.selectedNodeId;
            this.expansionLimits = { upstream: 3, downstream: 3 };

            const url = `${BASE_URL}/api/v1/lineage/graph?node_id=${encodeURIComponent(this.selectedNodeId)}&direction=${direction}&depth=1`;
            console.log('Expanding with URL:', url);
            // ... cleanup later
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

        // Update focus when expanding
        this.focusNodeId = this.selectedNodeId;
        this.expansionLimits = { upstream: 3, downstream: 3 };

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
                fetch(`${BASE_URL}/api/v1/lineage/graph?node_id=${encodeURIComponent(this.selectedNodeId)}&direction=${dir}&depth=1`)
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
        // Unhide any nodes that are being re-introduced/expanded
        if (newData.nodes) {
            newData.nodes.forEach(node => {
                if (this.hiddenNodeIds.has(node.id)) {
                    this.hiddenNodeIds.delete(node.id);
                    console.log(`[Manager] Unhiding node due to re-expansion: ${node.id}`);
                }
            });
        }

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
            // Apply folding logic before generating DSL
            const { visibleNodes, visibleEdges } = this.getFoldedGraph();

            const dsl = generateMermaidDSL(
                { nodes: visibleNodes, edges: visibleEdges },
                this.selectedNodeId,
                this.renderer,
                this.direction
            );

            const result = await renderMermaid(this.container, dsl, 'lineageGraph');

            if (result.success) {
                // Attach handlers immediately after render ensures availability
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

    /**
     * Group neighbors by direction and apply folding limits
     */
    /**
     * Group neighbors by direction and apply folding limits
     */
    getFoldedGraph() {
        return getFoldedGraph({
            nodes: this.nodes,
            edges: this.edges,
            focusNodeId: this.focusNodeId,
            selectedNodeId: this.selectedNodeId,
            hiddenNodeIds: this.hiddenNodeIds,
            expansionLimits: this.expansionLimits
        });
    }

    initializeZoomControls() {
        // Initialize zoom controls
        // console.log('[Manager] window.MermaidZoomControls type:', typeof window.MermaidZoomControls); // Removed excessive debug log
        if (!window.mermaidZoomControls) {
            if (typeof window.MermaidZoomControls !== 'function') {
                console.error('[Manager] CRITICAL: window.MermaidZoomControls is not a constructor!', window.MermaidZoomControls);
            }
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

        // Close detail panel on background click
        if (this.container) {
            this.container.onclick = (e) => {
                // If clicking directly on the SVG or container (background)
                if (e.target.tagName === 'svg' || e.target.id === 'mermaid-graph' || e.target.classList.contains('mermaid')) {
                    console.log('[Manager] Background clicked, clearing selection');
                    this.clearSelection();
                }
            };
        }
    }

    clearSelection() {
        this.selectedNodeId = null;
        selectionState.clear();

        // Optimize: Update styles directly instead of full render
        this.applySelectionStyles();

        this.setExpandButtonsState(false);
        this.hideContextMenu();

        // Dispatch event to close panel
        document.dispatchEvent(new CustomEvent('detail-panel:selection', {
            detail: { hasSelection: false }
        }));
    }

    attachNodeClickHandlers() {
        console.log('Attaching node click handlers...');

        // Specific selector to avoid catching parent container groups like "g.nodes"
        const selector = '.node, .flowchart-node, .mermaid-node, g.node:not(.nodes)';
        const nodes = this.container.querySelectorAll(selector);
        console.log(`Found ${nodes.length} nodes to attach handlers using selector: ${selector}`);

        if (nodes.length === 0) {
            // If still 0, try a last-ditch effort: wait a bit longer or log SVG structure
            console.warn('[Manager] No nodes found immediately. Retrying attachment in 100ms...');
            setTimeout(() => this.attachNodeClickHandlersSync(), 100);
            return;
        }

        this.attachNodeClickHandlersSync(nodes);
    }

    attachNodeClickHandlersSync(manualNodes = null) {
        const selector = '.node, .flowchart-node, .mermaid-node, g.node:not(.nodes)';
        const nodes = manualNodes || this.container.querySelectorAll(selector);
        if (nodes.length === 0) return;

        nodes.forEach((nodeElement) => {
            nodeElement.style.cursor = 'pointer';

            // Remove existing listeners by cloning
            const newNode = nodeElement.cloneNode(true);
            nodeElement.parentNode.replaceChild(newNode, nodeElement);

            newNode.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeText = newNode.textContent.trim();
                const nodeIdAttr = newNode.id || '';
                console.log(`Node clicked: Text="${nodeText}", ID="${nodeIdAttr}"`);

                // 0. Check if placeholder
                if (nodeIdAttr.includes('P_upstream')) {
                    this.handlePlaceholderClick('upstream');
                    return;
                }
                if (nodeIdAttr.includes('P_downstream')) {
                    this.handlePlaceholderClick('downstream');
                    return;
                }

                // 1. Try to find match by ID attribute first (most reliable)
                let matchingNode = null;

                // Mermaid IDs often look like "flowchart-T_project_dataset_table-45"
                // We want to see if our node IDs (table:project.dataset.table) match the middle part
                this.nodes.forEach(node => {
                    // Convert our ID (job:xxx) to the format used in Mermaid IDs (J_xxx)
                    const parts = node.id.split(':');
                    const type = parts[0];
                    const rest = parts.slice(1).join('_').replace(/[^a-zA-Z0-9_]/g, '_');
                    const mermaidPart = `${type === 'job' ? 'J' : 'T'}_${rest}`;

                    if (nodeIdAttr.includes(mermaidPart)) {
                        matchingNode = node;
                    }
                });

                // 2. Fallback: Match by searching label in concatenated text
                if (!matchingNode) {
                    let bestMatch = null;
                    let maxMatchLength = 0;

                    this.nodes.forEach(node => {
                        // Check label
                        if (node.label && nodeText.includes(node.label) && node.label.length > maxMatchLength) {
                            bestMatch = node;
                            maxMatchLength = node.label.length;
                        }
                        // Check ID suffix
                        const idSuffix = node.id.split(':').pop();
                        if (nodeText.includes(idSuffix) && idSuffix.length > maxMatchLength) {
                            bestMatch = node;
                            maxMatchLength = idSuffix.length;
                        }
                    });
                    matchingNode = bestMatch;
                }

                if (matchingNode) {
                    console.log('Matched node:', matchingNode.id);
                    this.selectNode(matchingNode.id);

                    // Update global selection state
                    selectionState.set({
                        id: matchingNode.id,
                        type: matchingNode.type,
                        source: 'graph',
                        label: matchingNode.label,
                        data: matchingNode
                    });

                    // Trigger detail panel update -> SUPPRESSED by user request
                    // window.dispatchEvent(new CustomEvent('nodeSelected', {
                    //    detail: { nodeId: matchingNode.id, node: matchingNode }
                    // }));

                    // Show Context Menu
                    this.showContextMenu(matchingNode.id, newNode);
                } else {
                    console.warn('No matching node found for click');
                }
            });
        });
    }

    /**
     * Increment expansion limit for a direction and re-render
     */
    async handlePlaceholderClick(direction) {
        console.log(`[Manager] Expanding ${direction} by 4 nodes`);
        this.expansionLimits[direction] += 4;
        await this.render();
    }

    async selectNode(nodeId) {
        if (this.selectedNodeId === nodeId) return;

        this.selectedNodeId = nodeId;

        // Optimize: Update styles directly instead of full render
        this.applySelectionStyles();

        // Enable expand buttons
        this.setExpandButtonsState(true);
    }

    applySelectionStyles() {
        if (!this.container) return;

        // Selector for all node elements
        const selector = '.node, .flowchart-node, .mermaid-node, g.node:not(.nodes)';
        const nodes = this.container.querySelectorAll(selector);

        const selectedMermaidId = this.selectedNodeId ? toMermaidId(this.selectedNodeId) : null;

        nodes.forEach(nodeEl => {
            const nodeIdAttr = nodeEl.id || '';
            const isSelected = selectedMermaidId && nodeIdAttr.includes(selectedMermaidId);

            if (isSelected) {
                nodeEl.classList.add('selected');
            } else {
                nodeEl.classList.remove('selected');
            }
        });
    }

    async focusNode(nodeId) {
        // 1. Select the node (triggers re-render with highlight and WAITS)
        await this.selectNode(nodeId);

        // 2. Center in view
        if (window.mermaidZoomControls) {
            const toMermaidId = (id) => {
                const parts = id.split(':');
                const type = parts[0];
                const rest = parts.slice(1).join('_').replace(/[^a-zA-Z0-9_]/g, '_');
                return `${type === 'job' ? 'J' : 'T'}_${rest}`;
            };

            const mermaidId = toMermaidId(nodeId);
            const nodeData = this.nodes.find(n => n.id === nodeId);
            const label = nodeData ? nodeData.label : null;

            // Give the browser one frame to layout the SVG elements properly after render
            requestAnimationFrame(() => {
                window.mermaidZoomControls.focusOnNode(mermaidId, label);
            });
        }
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

    async hideNode(nodeId) {
        if (!nodeId) return;
        this.hiddenNodeIds.add(nodeId);
        console.log(`[Manager] Hiding node: ${nodeId}`);
        await this.render();
        this.pushToHistory();
    }

    async resetHiddenNodes() {
        this.hiddenNodeIds.clear();
        console.log('[Manager] Reset hidden nodes');
        await this.render();
        this.pushToHistory();
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
            selectedNodeId: this.selectedNodeId,
            hiddenNodeIds: Array.from(this.hiddenNodeIds)
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
        this.hiddenNodeIds = new Set(state.hiddenNodeIds || []);

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

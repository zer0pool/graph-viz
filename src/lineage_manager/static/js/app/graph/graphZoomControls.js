/**
 * GraphZoomControls - Zoom and minimap controls
 * Handles zoom in/out, reset, minimap toggle
 */

import { SELECTORS } from "../config.js";

const MINIMAP_SELECTOR = "#cytoscape-minimap";
const MINIMAP_ZOOM_FACTOR = 0.15;

export class GraphZoomControls {
    constructor(graphView) {
        this.view = graphView;
        this.minimapVisible = false;
        this.minimapEl = null;
    }

    /**
     * Setup zoom controls
     */
    bindControls() {
        const cy = this.view.getCy();
        if (!cy) return;

        const zoomIn = document.querySelector(SELECTORS.zoomControls.in);
        const zoomOut = document.querySelector(SELECTORS.zoomControls.out);
        const reset = document.querySelector(SELECTORS.zoomControls.reset);
        const zoomReset = document.querySelector(SELECTORS.zoomControls.zoomReset);
        const minimap = document.querySelector(SELECTORS.zoomControls.minimap);

        const updateZoomDisplay = () => {
            const label = document.getElementById("zoom-level");
            if (label && cy) {
                label.textContent = `${Math.round(cy.zoom() * 100)}%`;
            }
        };

        zoomIn?.addEventListener("click", (e) => {
            e.preventDefault();
            const target = Math.min(cy.zoom() * 1.2, cy.maxZoom());
            cy.zoom(target);
            cy.center();
            updateZoomDisplay();
        });

        zoomOut?.addEventListener("click", (e) => {
            e.preventDefault();
            const target = Math.max(cy.zoom() * 0.8, cy.minZoom());
            cy.zoom(target);
            cy.center();
            updateZoomDisplay();
        });

        reset?.addEventListener("click", (e) => {
            e.preventDefault();
            cy.fit();
            cy.center();
            updateZoomDisplay();
        });

        zoomReset?.addEventListener("click", (e) => {
            e.preventDefault();
            cy.zoom(1.0);
            cy.center();
            updateZoomDisplay();
        });

        minimap?.addEventListener("click", (e) => {
            e.preventDefault();
            console.info("[Minimap] Toggle button clicked");
            this.toggleMinimap();
        });

        cy.on("zoom", updateZoomDisplay);
        updateZoomDisplay();
    }

    /**
     * Toggle minimap visibility
     */
    toggleMinimap() {
        console.info("[Minimap] toggleMinimap invoked. Current state:", this.minimapVisible);
        this.setMinimapVisible(!this.minimapVisible);
    }

    /**
     * Set minimap visibility
     */
    setMinimapVisible(visible) {
        this.minimapVisible = Boolean(visible);
        const mm = this.getMinimapElement();
        console.info("[Minimap] setMinimapVisible ->", this.minimapVisible, "element?", Boolean(mm));
        if (mm) {
            mm.style.display = this.minimapVisible ? "block" : "none";
        } else {
            // Element might not be ready yet; retry shortly
            requestAnimationFrame(() => {
                const retry = this.getMinimapElement();
                if (retry) {
                    retry.style.display = this.minimapVisible ? "block" : "none";
                }
            });
        }
    }

    /**
     * Get minimap element
     */
    getMinimapElement() {
        if (typeof document === "undefined") return null;

        if (this.minimapEl && document.body.contains(this.minimapEl)) {
            console.debug("[Minimap] Reusing cached minimap element");
            return this.minimapEl;
        }

        this.minimapEl = document.querySelector(MINIMAP_SELECTOR);
        if (this.minimapEl) {
            console.debug("[Minimap] Captured minimap element");
        }
        return this.minimapEl;
    }

    /**
     * Remove existing minimap instances
     */
    cleanupMinimapElements() {
        if (typeof document === "undefined") return;
        document.querySelectorAll(MINIMAP_SELECTOR).forEach((el) => el.remove());
        this.minimapEl = null;
    }

    /**
     * Setup minimap
     */
    setupMinimap() {
        const cy = this.view.getCy();
        if (!cy) return;

        // Remove orphaned minimap DOMs from previous renders
        this.cleanupMinimapElements();

        console.info("[Minimap] Initializing Cytoscape minimap (zoomFactor:", MINIMAP_ZOOM_FACTOR, ")");
        cy.minimap({ zoomFactor: MINIMAP_ZOOM_FACTOR });

        this.captureMinimapElement();
    }

    captureMinimapElement(attempt = 0) {
        const MAX_ATTEMPTS = 10;
        const shell = document.getElementById("graph-shell");
        const node = document.querySelector(MINIMAP_SELECTOR);

        if (node) {
            if (shell && node.parentElement !== shell) {
                shell.appendChild(node);
                console.debug("[Minimap] Reattached minimap to #graph-shell");
            }
            this.styleMinimap(node);
            this.minimapEl = node;
            node.style.display = this.minimapVisible ? "block" : "none";
            console.info("[Minimap] Minimap element ready.");
            return;
        }

        if (attempt >= MAX_ATTEMPTS) {
            console.warn("[Minimap] Failed to capture minimap element after retries.");
            return;
        }
        requestAnimationFrame(() => this.captureMinimapElement(attempt + 1));
    }

    styleMinimap(node) {
        if (!node) return;
        node.style.position = "absolute";
        node.style.bottom = "20px";
        node.style.right = "20px";
        node.style.left = "auto";
        node.style.top = "auto";
        node.style.width = "220px";
        node.style.height = "140px";
        node.style.background = "rgba(15, 23, 42, 0.75)";
        node.style.borderRadius = "8px";
        node.style.padding = "8px";
        node.style.boxShadow = "0 1px 6px rgba(0, 0, 0, 0.15)";
        node.style.pointerEvents = "auto";
        node.style.zIndex = "40";
    }

    /**
     * Is minimap visible
     */
    isMinimapVisible() {
        return this.minimapVisible;
    }
}

export default GraphZoomControls;

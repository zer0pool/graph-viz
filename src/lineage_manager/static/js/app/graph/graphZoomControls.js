/**
 * GraphZoomControls - Zoom and minimap controls
 * Handles zoom in/out, reset, minimap toggle
 */

import { SELECTORS } from "../config.js";

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
            this.toggleMinimap();
        });

        cy.on("zoom", updateZoomDisplay);
        updateZoomDisplay();
    }

    /**
     * Toggle minimap visibility
     */
    toggleMinimap() {
        this.setMinimapVisible(!this.minimapVisible);
    }

    /**
     * Set minimap visibility
     */
    setMinimapVisible(visible) {
        this.minimapVisible = Boolean(visible);
        const mm = this.getMinimapElement();
        if (mm) {
            mm.style.display = this.minimapVisible ? "block" : "none";
        }
    }

    /**
     * Get minimap element
     */
    getMinimapElement() {
        if (typeof document === "undefined") return null;

        if (this.minimapEl && document.body.contains(this.minimapEl)) {
            return this.minimapEl;
        }

        this.minimapEl = document.querySelector(".cy-minimap");
        return this.minimapEl;
    }

    /**
     * Setup minimap
     */
    setupMinimap() {
        const cy = this.view.getCy();
        if (cy) {
            cy.minimap({ zoomFactor: 3.0 });
            this.setMinimapVisible(false);
        }
    }

    /**
     * Is minimap visible
     */
    isMinimapVisible() {
        return this.minimapVisible;
    }
}

export default GraphZoomControls;

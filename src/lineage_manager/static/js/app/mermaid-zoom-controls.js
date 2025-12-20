/**
 * Mermaid Zoom Controls
 * Adds zoom in/out and reset functionality to Mermaid SVG
 */

class MermaidZoomControls {
    constructor(containerSelector = '#mermaid-graph') {
        this.container = document.querySelector(containerSelector);
        this.svg = null;
        this.zoomLevel = 1;  // Default 100% zoom
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.zoomStep = 0.2;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
    }

    init() {
        if (!this.container) {
            console.error('[Zoom] Container not found');
            return;
        }

        // Find SVG after render
        this.findSVG();

        if (this.svg) {
            this.setupPanning();
            this.updateTransform();
        }
    }

    findSVG() {
        this.svg = this.container.querySelector('svg');
        if (this.svg) {
            console.log('[Zoom] SVG found, initializing zoom controls');
            // Force absolute positioning to ignore Flexbox centering
            this.svg.style.position = 'absolute';
            this.svg.style.top = '0';
            this.svg.style.left = '0';
            this.svg.style.transformOrigin = '0 0';
        }
    }

    zoomIn() {
        this.setZoom(this.zoomLevel + this.zoomStep);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel - this.zoomStep);
    }

    resetZoom() {
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
    }

    fitToView() {
        if (!this.svg) return;

        try {
            const box = this.svg.getBBox();
            if (box.width === 0 || box.height === 0) return;

            const parent = this.container.getBoundingClientRect();

            // Add padding (10% on each side)
            const paddingX = parent.width * 0.1;
            const paddingY = parent.height * 0.1;

            const availWidth = parent.width - paddingX * 2;
            const availHeight = parent.height - paddingY * 2;

            // Calculate scale
            const scale = Math.min(
                availWidth / box.width,
                availHeight / box.height
            );

            // Clamp scale to reasonable limits
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, scale));

            // Center the graph
            // specific formula for 0 0 transform origin
            // We want to center the bounding box of the graph in the view

            // Target center in viewport coordinates
            const viewportCenterX = parent.width / 2;
            const viewportCenterY = parent.height / 2;

            // Graph center in local coordinates
            const graphCenterX = box.x + box.width / 2;
            const graphCenterY = box.y + box.height / 2;

            // Calculate pan needed
            // P_screen = P_local * zoom + pan
            // pan = P_screen - P_local * zoom
            this.panX = viewportCenterX - graphCenterX * this.zoomLevel;
            this.panY = viewportCenterY - graphCenterY * this.zoomLevel;

            this.updateTransform();
            console.log('[Zoom] Fit to view: level=', this.zoomLevel);
        } catch (e) {
            console.warn('[Zoom] Fit to view failed calculation', e);
            // Fallback to simple reset
            this.resetZoom();
        }
    }

    setZoom(newZoom) {
        if (!this.container) return;

        const parent = this.container.getBoundingClientRect();
        const centerX = parent.width / 2;
        const centerY = parent.height / 2;

        const oldZoom = this.zoomLevel;
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        // Adjust pan to keep center fixed (zoom towards center)
        // P_world = (P_screen - pan) / zoom
        const worldX = (centerX - this.panX) / oldZoom;
        const worldY = (centerY - this.panY) / oldZoom;

        // New pan: pan = P_screen - P_world * new_zoom
        this.panX = centerX - worldX * clampedZoom;
        this.panY = centerY - worldY * clampedZoom;

        this.zoomLevel = clampedZoom;
        this.updateTransform();
        console.log('[Zoom] Zoom level:', this.zoomLevel.toFixed(2));
    }

    updateTransform() {
        if (!this.svg) {
            this.findSVG();
            if (!this.svg) return;
        }

        if (this.svg) {
            // Important: Use top-left origin for predictable pan operations
            this.svg.style.transformOrigin = '0 0';
            this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
        }

        // Update zoom level display
        const display = document.getElementById('zoom-level');
        if (display) {
            display.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }

    setupPanning() {
        if (!this.svg) return;

        this.svg.style.cursor = 'grab';

        this.svg.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click only
                this.isPanning = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                this.svg.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startX;
                this.panY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        this.svg.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.svg.style.cursor = 'grab';
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isPanning = false;
            this.svg.style.cursor = 'grab';
        });

        // Mouse wheel zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Standardize delta
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));

            if (newZoom === this.zoomLevel) return;

            // Calculate mouse position relative to container
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate point in world coordinates (before zoom)
            // P_world = (P_screen - pan) / oldZoom
            const worldX = (mouseX - this.panX) / this.zoomLevel;
            const worldY = (mouseY - this.panY) / this.zoomLevel;

            // Apply new zoom
            this.zoomLevel = newZoom;

            // Calculate new pan to keep world point under mouse
            // P_screen = P_world * newZoom + newPan
            // newPan = P_screen - P_world * newZoom
            this.panX = mouseX - worldX * this.zoomLevel;
            this.panY = mouseY - worldY * this.zoomLevel;

            this.updateTransform();
            console.log('[Zoom] Wheel zoom to:', this.zoomLevel.toFixed(2));
        }, { passive: false });
    }
}

// Export for global use
window.MermaidZoomControls = MermaidZoomControls;

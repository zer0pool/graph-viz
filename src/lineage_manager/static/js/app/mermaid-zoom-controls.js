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
        // Reset to 100% view
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        console.log('[Zoom] Fit to view');
    }

    setZoom(newZoom) {
        const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        this.zoomLevel = clampedZoom;
        this.updateTransform();
        console.log('[Zoom] Zoom level:', this.zoomLevel.toFixed(2));
    }

    updateTransform() {
        if (!this.svg) {
            this.findSVG();
            if (!this.svg) return;
        }

        // Transform the SVG element itself, not the inner g
        if (this.svg) {
            this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
            this.svg.style.transformOrigin = 'center center';
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
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
            this.setZoom(this.zoomLevel + delta);
        });
    }
}

// Export for global use
window.MermaidZoomControls = MermaidZoomControls;

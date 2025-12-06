/**
 * GraphTooltip - Tooltip management for nodes
 * Shows hover tooltips with node information
 */

export class GraphTooltip {
    constructor(graphCanvas) {
        this.graphCanvas = graphCanvas;
        this.tooltip = null;
    }

    /**
     * Show tooltip at event position
     */
    show(evt, text, repositionOnly = false) {
        const pos = this.getRenderedPosition(evt);
        if (!pos) return;

        if (!this.tooltip) {
            this.tooltip = document.createElement("div");
            this.tooltip.className = "graph-tooltip";
            document.body.appendChild(this.tooltip);
        }

        if (!repositionOnly) {
            this.tooltip.textContent = text;
        }

        Object.assign(this.tooltip.style, {
            display: "block",
            left: `${pos.x + 12}px`,
            top: `${pos.y + 12}px`,
        });
    }

    /**
     * Hide tooltip
     */
    hide() {
        if (this.tooltip) {
            this.tooltip.style.display = "none";
        }
    }

    /**
     * Get rendered position for event
     */
    getRenderedPosition(evt) {
        if (!evt) return null;

        if (evt.renderedPosition) {
            const rect = this.graphCanvas?.getBoundingClientRect();
            return {
                x: (rect?.left || 0) + evt.renderedPosition.x,
                y: (rect?.top || 0) + evt.renderedPosition.y,
            };
        }

        if (evt.cy && evt.position) {
            const renderer = evt.cy.renderer();
            if (renderer?.projectIntoViewport) {
                const [x, y] = renderer.projectIntoViewport(
                    evt.position.x,
                    evt.position.y
                );
                return { x, y };
            }
        }

        return null;
    }

    /**
     * Show job tooltip
     */
    showJobTooltip(evt, repositionOnly = false) {
        const node = evt.target;
        if (!node) return;

        const type = (node.data("type") || "").toLowerCase();
        if (type !== "job") {
            if (!repositionOnly) this.hide();
            return;
        }

        const jobId = node.data("job_id") || node.id();
        this.show(evt, `Job: ${jobId}`, repositionOnly);
    }

    /**
     * Destroy tooltip
     */
    destroy() {
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }
}

export default GraphTooltip;

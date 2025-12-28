/**
 * Mermaid Renderer
 * Pure rendering module inspired by mermaid-live-editor
 * Handles only DSL → SVG conversion with proper error handling
 */

let isInitialized = false;

/**
 * Initialize Mermaid with 2x scaling
 */
export function initializeMermaid() {
    if (isInitialized) return;

    try {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
                defaultRenderer: 'dagre',
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis',
                nodeSpacing: 100,      // 2x spacing (default 50)
                rankSpacing: 100,      // 2x spacing (default 50)
                padding: 30            // 2x padding (default 15)
            },
            themeVariables: {
                fontSize: '32px',      // 2x font size (default 16px)
                fontFamily: 'Inter, -apple-system, sans-serif',
                primaryColor: '#e3f2fd',
                primaryBorderColor: '#1a73e8',
                primaryTextColor: '#202124',
                lineColor: '#666666',
                secondaryColor: '#e8f5e9',
                secondaryBorderColor: '#34a853'
            },
            logLevel: 'error'
        });

        isInitialized = true;
        console.log('[Mermaid] Initialized with 2x scale');
    } catch (err) {
        console.error('[Mermaid] Initialization failed:', err);
        throw err;
    }
}

/**
 * Render Mermaid DSL to container
 * @param {HTMLElement} container - Target container
 * @param {string} dsl - Mermaid DSL string
 * @param {string} id - Unique diagram ID
 * @returns {Promise<void>}
 */
export async function renderMermaid(container, dsl, id = 'lineageGraph') {
    if (!container) {
        throw new Error('Container element is required');
    }

    if (!dsl || typeof dsl !== 'string') {
        throw new Error('Valid DSL string is required');
    }

    // Clear container
    container.innerHTML = '';

    try {
        // Step 1: Parse DSL (validates syntax)
        await mermaid.parse(dsl);

        // Step 2: Create temporary div for rendering
        const tempDiv = document.createElement('div');
        tempDiv.className = 'mermaid';
        tempDiv.textContent = dsl;
        container.appendChild(tempDiv);

        // Step 3: Render
        await mermaid.run({
            nodes: [tempDiv],
            suppressErrors: false
        });

        return { success: true };

    } catch (error) {
        // Handle different error types
        return handleRenderError(error, container);
    }
}

/**
 * Handle rendering errors
 */
function handleRenderError(error, container) {
    console.error('Mermaid render error:', error);

    let errorMessage = 'Failed to render diagram';
    let errorType = 'unknown';

    // Parse error (syntax error)
    if (error.str || error.hash) {
        errorType = 'syntax';
        errorMessage = `Syntax error: ${error.str || error.message}`;
    }
    // Render error
    else if (error.message) {
        errorType = 'render';
        errorMessage = `Render error: ${error.message}`;
    }

    // Display error in container
    container.innerHTML = `
        <div class="mermaid-error">
            <div class="error-icon">⚠️</div>
            <div class="error-title">${errorType === 'syntax' ? 'Syntax Error' : 'Render Error'}</div>
            <div class="error-message">${errorMessage}</div>
        </div>
    `;

    return {
        success: false,
        error: errorMessage,
        type: errorType
    };
}

/**
 * Export diagram as SVG
 * @param {HTMLElement} container - Container with rendered diagram
 * @returns {string|null} SVG string
 */
export function exportSVG(container) {
    if (!container) return null;

    const svg = container.querySelector('svg');
    if (!svg) return null;

    return svg.outerHTML;
}

/**
 * Download SVG as file
 * @param {HTMLElement} container - Container with rendered diagram
 * @param {string} filename - Output filename
 */
export function downloadSVG(container, filename = 'lineage-graph.svg') {
    const svgContent = exportSVG(container);
    if (!svgContent) {
        console.error('No SVG found to download');
        return;
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Initialize on load if mermaid is available
if (typeof mermaid !== 'undefined') {
    initializeMermaid();
}

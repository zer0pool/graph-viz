/**
 * mermaid-viewer.js
 * Read-only Lineage Viewer using Mermaid.js
 * MFE-ready: Stateless, input via URL params
 */

// Initialize Mermaid with GCP-like theme
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        background: '#ffffff',
        primaryColor: '#e3f2fd',
        primaryBorderColor: '#1a73e8',
        primaryTextColor: '#202124',
        lineColor: '#dadce0',
        secondaryColor: '#e8f5e9',
        secondaryBorderColor: '#34a853',
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: '14px'
    }
});

let currentJobData = null;

async function initViewer() {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job_id');

    if (!jobId) {
        showError("Missing job_id parameter in URL.");
        return;
    }

    try {
        currentJobData = await fetchJobLineage(jobId);
        renderViewer();
    } catch (err) {
        showError(`Failed to load lineage: ${err.message}`);
    }
}

function renderViewer() {
    if (!currentJobData) return;
    const dsl = generateMermaidDSL(currentJobData);
    renderGraph(dsl).then(() => {
        hideLoading();
    });
}

async function fetchJobLineage(jobId) {
    const response = await fetch(`api/v1/jobs/${jobId}`);
    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }
    return await response.json();
}

/**
 * Generates Mermaid DSL in Job-Table-Job format
 */
function generateMermaidDSL(jobData) {
    const targetJobRaw = jobData.job_id;
    const targetJobId = sanitizeId(targetJobRaw);

    const upstreams = jobData.upstreams || [];
    const downstreams = jobData.downstreams || [];

    const LIMIT = 5;
    const nodes = new Set();
    const edges = [];

    function sanitizeId(id) {
        return "id_" + id.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    // 1. Add Target Job
    nodes.add(`  ${targetJobId}["${targetJobRaw}"]:::job`);

    // 2. Handle Upstreams
    const visibleUpstreams = upstreams.slice(0, LIMIT);
    const hiddenUpCount = upstreams.length - LIMIT;

    visibleUpstreams.forEach((up, idx) => {
        if (up.type === 'table') {
            const tableId = sanitizeId(`T_UP_${idx}`);
            nodes.add(`  ${tableId}["${up.name}"]:::table`);
            edges.push(`  ${tableId} --> ${targetJobId}`);

            if (up.writing_jobs) {
                up.writing_jobs.forEach((wj, widx) => {
                    const wjId = sanitizeId(`WJ_${idx}_${widx}_${wj}`);
                    nodes.add(`  ${wjId}["${wj}"]:::job`);
                    edges.push(`  ${wjId} --> ${tableId}`);
                });
            }
        }
    });

    if (hiddenUpCount > 0) {
        const moreUpId = "ID_MORE_UP";
        nodes.add(`  ${moreUpId}["+ ${hiddenUpCount} more upstream nodes"]:::more`);
        edges.push(`  ${moreUpId} -.-> ${targetJobId}`);
    }

    // 3. Handle Downstreams
    const visibleDownstreams = downstreams.slice(0, LIMIT);
    const hiddenDownCount = downstreams.length - LIMIT;

    visibleDownstreams.forEach((down, idx) => {
        if (down.type === 'table') {
            const tableId = sanitizeId(`T_DOWN_${idx}`);
            nodes.add(`  ${tableId}["${down.name}"]:::table`);
            edges.push(`  ${targetJobId} --> ${tableId}`);

            if (down.reading_jobs) {
                down.reading_jobs.forEach((rj, ridx) => {
                    const rjId = sanitizeId(`RJ_${idx}_${rj}`);
                    nodes.add(`  ${rjId}["${rj}"]:::job`);
                    edges.push(`  ${tableId} --> ${rjId}`);
                });
            }
        }
    });

    if (hiddenDownCount > 0) {
        const moreDownId = "ID_MORE_DOWN";
        nodes.add(`  ${moreDownId}["+ ${hiddenDownCount} more downstream nodes"]:::more`);
        edges.push(`  ${targetJobId} -.-> ${moreDownId}`);
    }

    const lines = [
        'graph LR',
        '  classDef job fill:#e3f2fd,stroke:#1a73e8,rx:6,ry:6',
        '  classDef table fill:#e8f5e9,stroke:#34a853,rx:6,ry:6',
        '  classDef more fill:#f8f9fa,stroke:#dadce0,stroke-dasharray: 5 5,rx:6,ry:6',
        '  classDef selected stroke:#1a73e8,stroke-width:3.5px',
        ...Array.from(nodes),
        ...edges,
        `  ${targetJobId}:::selected`,
        '  linkStyle default stroke:#dadce0,stroke-width:1px'
    ];

    const dsl = lines.join('\n');
    console.log("Generated Mermaid DSL:\n", dsl);
    return dsl;
}

async function renderGraph(dsl) {
    const container = document.getElementById('mermaid-graph');

    // Clear previous content
    container.innerHTML = '';

    // Set new DSL
    container.textContent = dsl;

    // Re-verify class
    container.className = 'mermaid';

    try {
        await mermaid.run({
            nodes: [container]
        });
    } catch (renderError) {
        console.error("Mermaid Render Error:", renderError);
        throw renderError;
    }
}

function showError(msg) {
    const errDiv = document.getElementById('error');
    const msgP = errDiv.querySelector('.error-message');
    msgP.textContent = msg;
    errDiv.style.display = 'block';
    hideLoading();
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Start the viewer
document.addEventListener('DOMContentLoaded', initViewer);

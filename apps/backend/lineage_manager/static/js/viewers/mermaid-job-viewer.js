/**
 * Mermaid Job-Only Lineage Viewer
 * 
 * Visualizes direct Job-to-Job dependencies by collapsing intermediate tables.
 * Uses /api/v1/jobs/{job_id}/graph?depth=2 to get enough data for 1-hop job dependencies.
 */

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        primaryColor: '#e3f2fd',
        primaryTextColor: '#1a73e8',
        lineColor: '#dadce0',
        secondaryColor: '#e8f5e9',
        secondaryBorderColor: '#34a853',
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: '14px'
    }
});

let currentJobId = null;

async function initViewer() {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job_id');

    if (!jobId) {
        showError("Missing job_id parameter in URL.");
        return;
    }
    currentJobId = jobId;

    try {
        const graphData = await fetchJobGraph(jobId);
        const dsl = generateJobOnlyDSL(graphData);
        await renderGraph(dsl);
        hideLoading();
    } catch (err) {
        showError(`Failed to load job lineage: ${err.message}`);
    }
}

async function fetchJobGraph(jobId) {
    // depth=2 is required to see Job -> Table -> NEXT_JOB
    const response = await fetch(`api/v1/jobs/${jobId}/graph?depth=2`);
    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }
    const data = await response.json();
    return data.dependencies;
}

function generateJobOnlyDSL(graphData) {
    const nodes = graphData.nodes || [];
    const rawEdges = graphData.edges || [];

    const jobs = nodes.filter(n => n.type === 'job');
    const tables = nodes.filter(n => n.type === 'table');

    const tableIdMap = {}; // tId -> { sources: Set, targets: Set }
    tables.forEach(t => {
        tableIdMap[t.id] = { sources: new Set(), targets: new Set(), name: t.full_name };
    });

    const jobMap = {}; // jId -> jobObj
    jobs.forEach(j => {
        jobMap[j.id] = j;
    });

    // Process edges to populate table mappings
    rawEdges.forEach(edge => {
        const { source, target } = edge;

        // Job -> Table (Output)
        if (jobMap[source] && tableIdMap[target]) {
            tableIdMap[target].sources.add(source);
        }
        // Table -> Job (Input)
        else if (tableIdMap[source] && jobMap[target]) {
            tableIdMap[source].targets.add(target);
        }
        // Job -> Job (Direct - if any exist in the data)
        // Though our schema usually goes through tables
    });

    // Identify the center job node
    const rootJob = jobs.find(j => j.job_id === currentJobId);
    const rootJobInternalId = rootJob ? rootJob.id : null;

    function sanitizeId(id) {
        return "id_" + id.replace(/[^a-zA-Z0-9_]/g, '_');
    }
    const sanitizedRootId = rootJob ? sanitizeId(rootJob.job_id) : null;

    // Collect distinct upstream and downstream jobs
    const upstreamJobIds = new Set();
    const downstreamJobIds = new Set();

    Object.values(tableIdMap).forEach(tInfo => {
        const isInputToRoot = rootJobInternalId && tInfo.targets.has(rootJobInternalId);
        const isOutputFromRoot = rootJobInternalId && tInfo.sources.has(rootJobInternalId);

        if (isInputToRoot) {
            tInfo.sources.forEach(sid => { if (sid !== rootJobInternalId) upstreamJobIds.add(sid); });
        }
        if (isOutputFromRoot) {
            tInfo.targets.forEach(tid => { if (tid !== rootJobInternalId) downstreamJobIds.add(tid); });
        }
    });

    const LIMIT = 5;
    const finalNodes = new Set();
    const finalEdges = new Set();

    // Add root job
    if (rootJob) {
        finalNodes.add(`  ${sanitizedRootId}["${rootJob.job_id}"]:::job`);
    }

    // Handle Upstreams
    const upArr = Array.from(upstreamJobIds);
    const visibleUp = upArr.slice(0, LIMIT);
    const hiddenUpCount = upArr.length - LIMIT;

    visibleUp.forEach(jid => {
        const job = jobMap[jid];
        const sId = sanitizeId(job.job_id);
        finalNodes.add(`  ${sId}["${job.job_id}"]:::job`);
        finalEdges.add(`  ${sId} --> ${sanitizedRootId}`);
    });

    if (hiddenUpCount > 0) {
        const moreUpId = "ID_MORE_UP";
        finalNodes.add(`  ${moreUpId}["+ ${hiddenUpCount} more jobs"]:::more`);
        finalEdges.add(`  ${moreUpId} -.-> ${sanitizedRootId}`);
    }

    // Handle Downstreams
    const downArr = Array.from(downstreamJobIds);
    const visibleDown = downArr.slice(0, LIMIT);
    const hiddenDownCount = downArr.length - LIMIT;

    visibleDown.forEach(jid => {
        const job = jobMap[jid];
        const sId = sanitizeId(job.job_id);
        finalNodes.add(`  ${sId}["${job.job_id}"]:::job`);
        finalEdges.add(`  ${sanitizedRootId} --> ${sId}`);
    });

    if (hiddenDownCount > 0) {
        const moreDownId = "ID_MORE_DOWN";
        finalNodes.add(`  ${moreDownId}["+ ${hiddenDownCount} more jobs"]:::more`);
        finalEdges.add(`  ${sanitizedRootId} -.-> ${moreDownId}`);
    }

    let selectedStatement = "";
    if (rootJob) {
        selectedStatement = `  ${sanitizedRootId}:::selected`;
    }

    const lines = [
        'graph LR',
        '  classDef job fill:#e3f2fd,stroke:#1a73e8,rx:6,ry:6',
        '  classDef more fill:#f8f9fa,stroke:#dadce0,stroke-dasharray: 5 5,rx:6,ry:6',
        '  classDef selected stroke:#1a73e8,stroke-width:3.5px',
        ...Array.from(finalNodes),
        ...Array.from(finalEdges),
        selectedStatement,
        '  linkStyle default stroke:#dadce0,stroke-width:1px'
    ];

    return lines.join('\n');
}

async function renderGraph(dsl) {
    const container = document.getElementById('mermaid-graph');

    try {
        const id = 'mermaid_' + Math.floor(Math.random() * 1000000);
        const { svg } = await mermaid.render(id, dsl);
        container.innerHTML = svg;
    } catch (err) {
        console.error("Mermaid Render Error:", err);
        container.innerHTML = `<div class="error-panel"><p>Render Error: ${err.message}</p></div>`;
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(msg) {
    hideLoading();
    const errPanel = document.getElementById('error-message');
    const errText = document.getElementById('error-text');
    errText.textContent = msg;
    errPanel.style.display = 'block';
}

// Start Initialization
document.addEventListener('DOMContentLoaded', initViewer);

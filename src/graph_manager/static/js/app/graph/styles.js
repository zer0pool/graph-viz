const svgDataUri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim())}`;
const icon = (svg) => `url("${svgDataUri(svg)}")`;

const ICONS = {
  plus: icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22">
      <rect x="0.8" y="0.8" width="20.4" height="20.4" rx="6.4" fill="#ffffff" stroke="#cbd5f5" stroke-width="1.4"/>
      <path d="M11 5.5v11M5.5 11h11" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),
  dataset: icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="9.5" fill="#e3efff" stroke="#2563eb" stroke-width="2"/>
      <path d="M16.8 16.8L21 21" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M9.5 13a3.5 3.5 0 1 0 7 0 3.5 3.5 0 0 0-7 0z" fill="#ffffff" stroke="#2563eb" stroke-width="1.6"/>
    </svg>
  `),
  anchor: icon(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill="#2563eb" stroke="#e0edff" stroke-width="2" />
    </svg>
  `),
};

export function getGraphStyles() {
  return [
    {
      selector: "node",
      style: {
        shape: "round-rectangle",
        width: 252,
        height: 66,
        "border-width": 1.5,
        "border-color": "#cbd5f5",
        "background-color": "#ffffff",
        "background-fit": "none",
        "font-size": "13px",
        "font-weight": 600,
        "text-wrap": "wrap",
        "text-max-width": 170,
        "line-height": 1.25,
        "text-halign": "left",
        "text-valign": "center",
        "text-margin-x": 142,
        color: "#0f172a",
        label: "data(label_text)",
        "min-zoomed-font-size": 6,
        "transition-property": "border-color, background-color, opacity",
        "transition-duration": "160ms",
        "transition-timing-function": "ease-out",
        "overlay-padding": 8,
        "overlay-opacity": 0,
        "padding": "12px",
      },
    },
    {
      selector: "node[type='table']",
      style: {
        "border-color": "#16a34a",
        "background-color": "#ffffff",
        "text-max-width": 190,
        "text-margin-x": 150,
        "background-image": [ICONS.plus, ICONS.dataset, ICONS.anchor, ICONS.anchor],
        "background-width": ["22px", "26px", "10px", "10px"],
        "background-height": ["22px", "26px", "10px", "10px"],
        "background-position-x": ["22px", "60px", "0%", "100%"],
        "background-position-y": ["50%", "50%", "50%", "50%"],
        "background-repeat": ["no-repeat", "no-repeat", "no-repeat", "no-repeat"],
      },
    },
    {
      selector: "node[type='job']",
      style: {
        width: 140,
        height: 52,
        shape: "round-rectangle",
        label: "JOB",
        "font-size": "13px",
        "font-weight": 700,
        "text-valign": "top",
        "text-halign": "center",
        "text-wrap": "none",
        "text-margin-x": 0,
        "text-margin-y": 8,
        "border-width": 1.6,
        "border-color": "#f97316",
        "background-color": "#fff7ee",
        color: "#b45309",
        "background-image": [ICONS.anchor, ICONS.anchor],
        "background-width": ["10px", "10px"],
        "background-height": ["10px", "10px"],
        "background-position-x": ["0%", "100%"],
        "background-position-y": ["50%", "50%"],
        "background-repeat": ["no-repeat", "no-repeat"],
      },
    },
    {
      selector: "node.hovered",
      style: {
        "border-color": "#0f172a",
        "overlay-opacity": 0.08,
        "overlay-color": "#0f172a",
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "unbundled-bezier",
        "edge-distances": "endpoints",
        "source-endpoint": "90deg",
        "target-endpoint": "270deg",
        "control-point-distances": [50],
        "control-point-weights": [0.45],
        "target-arrow-shape": "triangle",
        "line-color": "#9ca3af",
        "target-arrow-color": "#9ca3af",
        width: 2,
        "line-cap": "round",
        "line-style": "solid",
      },
    },
    {
      selector: "node.selected",
      style: {
        "border-color": "#0f172a",
        "border-width": 3,
        "overlay-color": "#0f172a",
        "overlay-opacity": 0.12,
      },
    },
    {
      selector: "node[status = 'error']",
      style: {
        "border-color": "#ef4444",
        "background-color": "#fef2f2",
        color: "#991b1b",
      },
    },
    {
      selector: "node[status = 'disabled']",
      style: {
        "border-color": "#94a3b8",
        "background-color": "#f8fafc",
        color: "#475569",
      },
    },
    { selector: "node.connected", style: { opacity: 0.98 } },
    { selector: "node.dimmed", style: { opacity: 0.45 } },
    { selector: "node.filtered-out", style: { opacity: 0.2 } },
    {
      selector: "node.pulse",
      style: {
        "border-color": "#f79009",
        "border-width": 4,
        "overlay-color": "#f79009",
        "overlay-opacity": 0.12,
      },
    },
    {
      selector: "edge.highlighted",
      style: {
        "line-color": "#2563eb",
        "target-arrow-color": "#2563eb",
        width: 3,
      },
    },
    { selector: "edge.dimmed", style: { opacity: 0.3 } },
  ];
}

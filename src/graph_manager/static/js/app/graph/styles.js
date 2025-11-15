export function getGraphStyles() {
  return [
    {
      selector: "node",
      style: {
        shape: "ellipse",
        width: 90,
        height: 90,
        "background-color": "#ffffff",
        "border-width": 2,
        "border-color": "#c9d2e4",
        label: "data(label)",
        color: "#1f2937",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "13px",
        "font-weight": "600",
        "text-wrap": "wrap",
        "text-max-width": "70px",
        "transition-property": "background-color, border-color, border-width, width, height, opacity",
        "transition-duration": "240ms",
        "transition-timing-function": "ease-out",
      },
    },
    {
      selector: "node[type='table']",
      style: {
        "background-color": "#25b171",
        "border-color": "#10804d",
        color: "#ffffff",
      },
    },
    {
      selector: "node[type='job']",
      style: {
        "background-color": "#2c7cf4",
        "border-color": "#1c5dc0",
        color: "#ffffff",
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "straight",
        "target-arrow-shape": "triangle",
        "line-color": "#8ca0c2",
        "target-arrow-color": "#c28c8c",
        width: 1.8,
        "z-index": 0,
      },
    },
    {
      selector: "node.selected",
      style: {
        width: 110,
        height: 110,
        "border-width": 4,
        "border-color": "#0f172a",
        "overlay-color": "#0f172a",
        "overlay-padding": 4,
        "overlay-opacity": 0.08,
      },
    },
    { selector: "node.connected", style: { opacity: 0.95 } },
    { selector: "node.dimmed", style: { opacity: 0.75 } },
    { selector: "node.filtered-out", style: { opacity: 0.25 } },
    {
      selector: "node.pulse",
      style: {
        "border-color": "#f79009",
        "border-width": 5,
        "overlay-color": "#f79009",
        "overlay-opacity": 0.12,
      },
    },
    { selector: "edge.highlighted", style: { "line-color": "#1c5dc0", "target-arrow-color": "#1c5dc0", width: 3 } },
    { selector: "edge.dimmed", style: { opacity: 0.35 } },
  ];
}

export function getGraphStyles() {
  return [
    {
      selector: "node",
      style: {
        shape: "rectangle",
        width: "mapData(label_length, 0, 30, 80, 300)",
        height: 40,
        "border-width": 1.5,
        "border-color": "#cbd5f5",
        "background-color": "#ffffff",
        "font-size": "14px",
        "font-weight": 600,
        "text-wrap": "wrap",
        "text-halign": "center",
        "text-valign": "center",
        "line-height": 1.2,
        color: "#0f172a",
        label: "data(label_text)",
        "min-zoomed-font-size": 6,
        "transition-property": "border-color, background-color, opacity",
        "transition-duration": "160ms",
        "transition-timing-function": "ease-out",
        "overlay-padding": 8,
        "overlay-opacity": 0,
        padding: "6px 24px",
      },
    },
    {
      selector: "node[type='table']",
      style: {
        width: "mapData(label_length, 0, 30, 80, 300)",
        height: 40,
        padding: "6px 28px",
        "border-color": "#94a3b8",
        "background-color": "#ffffff",
        "text-wrap": "wrap",
        "text-halign": "center",
        "text-valign": "center",
      },
    },
    {
      selector: "node[type='job']",
      style: {
        shape: "rectangle",
        width: 60,
        height: 24,
        label: "JOB",
        "font-size": 13,
        "font-weight": 700,
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "none",
        "border-width": 1.6,
        "border-color": "#f97316",
        "background-color": "#ffffff",
        color: "#b45309",
      },
    },
    {
      selector: "node[type='aggregate']",
      style: {
        shape: "round-rectangle",
        width: "label",
        height: 32,
        padding: "8px 16px",
        "border-width": 2,
        "border-style": "dashed",
        "border-color": "#9ca3af",
        "background-color": "#f9fafb",
        "font-size": "12px",
        "font-weight": 500,
        "font-style": "italic",
        color: "#6b7280",
        label: "data(label)",
        "text-halign": "center",
        "text-valign": "center",
        cursor: "pointer",
        "transition-property": "border-color, background-color, border-width",
        "transition-duration": "200ms",
      },
    },
    {
      selector: "node[type='aggregate']:hover",
      style: {
        "border-color": "#1a73e8",
        "background-color": "#e8f0fe",
        color: "#1967d2",
        "border-width": 2.5,
      },
    },
    {
      selector: "node[type='aggregate'].heartbeat",
      style: {
        "border-width": 3,
        "overlay-opacity": 0.15,
        "overlay-color": "#1a73e8",
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
        "curve-style": "straight",
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
        "border-width": 4,
        "overlay-color": "#0f172a",
        "overlay-opacity": 0.05,
        "shadow-blur": 12,
        "shadow-color": "#000",
        "shadow-opacity": 0.2,
        "shadow-offset-y": 2,
      },
    },
    {
      selector: "node.selected[type='table']",
      style: {
        "border-color": "#1967d2", // Darker Blue
        "background-color": "#e8f0fe", // Light Blue active state
        "shadow-color": "#1967d2",
        "shadow-opacity": 0.4,
      },
    },
    {
      selector: "node.selected[type='job']",
      style: {
        "border-color": "#e65100", // Darker Orange
        "background-color": "#fff7ed", // Light Orange active state
        "shadow-color": "#e65100",
        "shadow-opacity": 0.4,
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
      selector: "node.pulse[type='table']",
      style: {
        "border-color": "#1a73e8",
        "overlay-color": "#1a73e8",
      },
    },
    {
      selector: "node.pulse[type='job']",
      style: {
        "border-color": "#fb8c00",
        "overlay-color": "#fb8c00",
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
    {
      selector: ".aggregate-edge",
      style: {
        "line-style": "dashed",
        "line-color": "#d1d5db",
        "width": 1.5,
        "target-arrow-shape": "none",
        "opacity": 0.6,
        "curve-style": "straight" // Ensure it's straight like others or 'bezier' if needed
      },
    },
  ];
}

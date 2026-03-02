import React from "react";
import { BarChart3 } from "lucide-react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { DepartmentJobItem } from "../lib/hooks/useJobDepartmentData";

interface DepartmentHeatmapCardProps {
  items: DepartmentJobItem[];
  total: number;
  loading?: boolean;
}

// Indigo/blue color palette for tiles
const COLORS = [
  "#4338ca", // indigo-700
  "#4f46e5", // indigo-600
  "#6366f1", // indigo-500
  "#818cf8", // indigo-400
  "#a5b4fc", // indigo-300
  "#3b82f6", // blue-500
  "#6d28d9", // violet-700
  "#7c3aed", // violet-600
  "#8b5cf6", // violet-500
  "#60a5fa", // blue-400
];

interface CustomContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  index?: number;
}

function CustomContent(props: CustomContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, value, index = 0 } = props;
  const color = COLORS[index % COLORS.length];
  const isSmall = width < 60 || height < 40;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill: color, stroke: "#fff", strokeWidth: 2 }}
        rx={4}
        ry={4}
      />
      {!isSmall && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(13, Math.max(9, width / 8))}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={Math.min(20, Math.max(11, width / 6))}
            fontWeight={700}
            style={{ pointerEvents: "none" }}
          >
            {value}
          </text>
        </>
      )}
    </g>
  );
}

interface TooltipPayload {
  name?: string;
  value?: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-gray-700">
      <div className="font-semibold">{name}</div>
      <div className="text-indigo-300">{value} jobs</div>
    </div>
  );
}

export function DepartmentHeatmapCard({ items, total, loading = false }: DepartmentHeatmapCardProps) {
  // Items are already sorted descending by count from the hook
  const data = items.map((item) => ({
    name: item.department,
    size: item.count,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-4 col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          Jobs by Department
        </h3>
        {total > 0 && (
          <span className="text-xs text-gray-400 font-medium">{total} total jobs</span>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 animate-pulse">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 italic text-sm">
          No department data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={data}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<CustomContent />}
            isAnimationActive={false}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      )}
    </div>
  );
}

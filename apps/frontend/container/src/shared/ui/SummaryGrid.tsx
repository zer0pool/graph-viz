import React from "react";
import {
  Users,
  UserCheck,
  UserMinus,
  Shield,
  Activity,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Table2,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// 1. Common Metric Data Type
export interface MetricData {
  type: string;
  value: number | string;
  subtext: string;
  status?: "default" | "warning" | "critical";
  breakdown?: { label: string; value: number | string; color?: string }[];
}

// 2. Resource Map for Shell (Audit, Users, etc.)
const RESOURCE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  // User related
  total_users: { label: "Total Users", icon: Users, color: "text-blue-500" },
  active_users: { label: "Active Users", icon: UserCheck, color: "text-green-500" },
  inactive_users: { label: "Inactive Users", icon: UserMinus, color: "text-slate-400" },
  privileged_users: { label: "Privileged Users", icon: Shield, color: "text-indigo-600" },
  
  // Audit related
  total_commands: { label: "Total Commands", icon: Terminal, color: "text-blue-600" },
  success_ops: { label: "Success Ops", icon: CheckCircle2, color: "text-green-600" },
  failed_ops: { label: "Failed Ops", icon: XCircle, color: "text-red-500" },
  delayed_ops: { label: "Delayed", icon: Clock, color: "text-orange-500" },
  sla_breach: { label: "SLA Breach", icon: AlertTriangle, color: "text-red-600" },
  
  // Dashboard exclusive
  total_tables: { label: "Total Tables", icon: Table2, color: "text-blue-600" },
  total_jobs: { label: "Total Jobs", icon: Briefcase, color: "text-indigo-500" },
  dummy_chart: { label: "Dummy Chart", icon: Activity, color: "text-slate-400" },
  
  default: { label: "Metric", icon: Activity, color: "text-slate-400" },
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border bg-white text-card-foreground shadow-sm ${className || ""}`}>
    {children}
  </div>
);

const MetricPie = ({ data }: { data: { label: string; value: number | string; color?: string }[] }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const total = data.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  if (total === 0) return null;

  let currentPercent = 0;
  return (
    <div className="relative w-8 h-8 shrink-0 group/pie">
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 overflow-visible">
        {data.map((item, idx) => {
          const val = Number(item.value);
          const percent = (val / total) * 100;
          
          const tailwindColors: Record<string, string> = {
            'bg-blue-500': '#3b82f6',
            'bg-blue-600': '#2563eb',
            'bg-indigo-500': '#6366f1',
            'bg-amber-500': '#f59e0b',
            'bg-emerald-500': '#10b981',
            'bg-orange-500': '#f97316',
          };
          const colorHex = tailwindColors[item.color || ''] || '#cbd5e1';

          const dashArray = `${percent} ${100 - percent}`;
          const dashOffset = -currentPercent;
          currentPercent += percent;

          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15.915"              
              fill="transparent"
              stroke={colorHex}
              strokeWidth="31.83" // Radius * 2 to fill center
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-300 cursor-help"
              style={{
                strokeWidth: hoveredIndex === idx ? '34' : '31.83',
                opacity: hoveredIndex !== null && hoveredIndex !== idx ? 0.6 : 1,
              }}
            />
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div className="absolute top-0 left-1/2 z-[500] bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-[120%] whitespace-nowrap border border-gray-700 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${data[hoveredIndex].color || "bg-white"}`} />
            <span className="font-medium text-gray-300">{data[hoveredIndex].label}:</span>
            <span className="font-bold whitespace-nowrap">
              {((Number(data[hoveredIndex].value) / total) * 100).toFixed(1)}%
            </span>
          </div>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

function MetricCard({ data }: { data: MetricData }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const config = RESOURCE_MAP[data.type] || RESOURCE_MAP.default;
  const Icon = config.icon;

  const subtextColor =
    data.status === "critical"
      ? "text-red-600 font-medium"
      : data.status === "warning"
        ? "text-orange-600 font-medium"
        : "text-gray-500";

  return (
    <Card className="px-6 py-4 flex flex-col group hover:shadow-md transition-all duration-200 relative">
      <div className="flex items-center">
        <div className="flex flex-col space-y-1.5 flex-1">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            {config.label}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">
                {typeof data.value === "number" ? data.value.toLocaleString() : data.value}
              </h3>
              <p className={`text-[11px] ${subtextColor} mt-1.5 leading-tight`}>{data.subtext}</p>
            </div>
          </div>
        </div>
        
        {data.breakdown && (
          <div className="flex-1 flex justify-center">
            <MetricPie data={data.breakdown} />
          </div>
        )}
      </div>
      
      {data.breakdown && data.breakdown.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 flex flex-col">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            <span>DETAILS</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          
          <div className={`flex flex-col gap-1.5 transition-all duration-300 ease-in-out origin-top ${isExpanded ? "max-h-20 opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"}`}>
            {data.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.color || "bg-gray-300"}`} />
                  <span>{item.label}</span>
                </div>
                <span className="font-bold text-gray-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

interface SummaryGridProps {
  metrics: MetricData[];
  cols?: number;
}

export function SummaryGrid({ metrics, cols = 4 }: SummaryGridProps) {
  const gridColsClass = {
    4: "grid-cols-4",
    5: "grid-cols-5",
  }[cols] || "grid-cols-4";

  return (
    <div className={`grid ${gridColsClass} gap-4 mb-6`}>
      {metrics.map((m, idx) => (
        <MetricCard key={`${m.type}-${idx}`} data={m} />
      ))}
    </div>
  );
}

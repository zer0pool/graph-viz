import React from "react";
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Table2,
  Database,
  GitBranch,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";

// 1. Common Metric Data Type
export interface MetricData {
  type: string;
  value: number | string;
  label?: string; // Optional dynamic label
  subtext?: string;
  status?: "default" | "warning" | "critical" | "success" | "info" | "destructive";
  breakdown?: { label: string; value: number | string; color?: string }[];
}

// 2. 통합 리소스 맵 (Job, Table 등 모든 도메인의 아이콘/레이블 관리)
const RESOURCE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  // Job 관련
  total_jobs: { label: "Registered Jobs", icon: Briefcase, color: "text-blue-500" },
  success_execution: { label: "Successful Jobs", icon: CheckCircle2, color: "text-green-500" },
  failed_execution: { label: "Failed Jobs", icon: XCircle, color: "text-red-500" },
  
  // Table 관련
  total_tables: { label: "Tables", icon: Table2, color: "text-blue-600" },
  total_datasets: { label: "Datasets", icon: Database, color: "text-indigo-500" },
  total_size: { label: "Total Size", icon: Database, color: "text-slate-500" },
  lineage_coverage: { label: "Lineage Coverage", icon: GitBranch, color: "text-primary" },
  
  // 공통/기타
  delayed: { label: "Delayed", icon: Clock, color: "text-orange-500" },
  expiring_soon: { label: "Expiring Soon", icon: Clock, color: "text-yellow-500" },
  sla_breach: { label: "SLA Breach", icon: AlertTriangle, color: "text-red-600" },
  
  // New Summary Metrics (Synced from Container)
  total_assets: { label: "Total Assets", icon: Activity, color: "text-indigo-600" },
  active_users: { label: "Active Users", icon: Activity, color: "text-green-500" },
  daily_ingestion: { label: "Daily Ingestion", icon: Activity, color: "text-blue-500" },
  system_health: { label: "System Health", icon: CheckCircle2, color: "text-emerald-500" },
  running_jobs: { label: "Running Now", icon: Activity, color: "text-emerald-500" },
  failed_jobs: { label: "Failed (24h)", icon: AlertTriangle, color: "text-red-500" },
  avg_duration: { label: "Avg. Duration", icon: Clock, color: "text-blue-400" },
  bq_tables: { label: "BigQuery Source", icon: Table2, color: "text-sky-500" },
  storage_size: { label: "Metadata Size", icon: Table2, color: "text-slate-500" },
  freshness: { label: "Data Freshness", icon: Activity, color: "text-emerald-600" },
  admin_users: { label: "Admins", icon: Shield, color: "text-orange-500" },
  api_keys: { label: "API Keys", icon: Activity, color: "text-blue-600" },

  default: { label: "Metric", icon: Activity, color: "text-slate-400" },
};

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
          const percent = parseFloat(((val / total) * 100).toFixed(2));
          
          const tailwindColors: Record<string, string> = {
            'bg-blue-500': '#3b82f6',
            'bg-blue-600': '#2563eb',
            'bg-indigo-500': '#6366f1',
            'bg-amber-500': '#f59e0b',
            'bg-emerald-500': '#10b981',
            'bg-orange-500': '#f97316',
          };
          const colorHex = tailwindColors[item.color || ''] || '#cbd5e1';

          const dashArray = `${percent.toFixed(2)} ${(100 - percent).toFixed(2)}`;
          const dashOffset = -parseFloat(currentPercent.toFixed(2));
          currentPercent += percent;

          return (
            <circle
              key={idx}
              cx="18"
              cy="18"
              r="15"              
              fill="transparent"
              stroke={colorHex}
              strokeWidth="30" // Radius * 2 to fill center
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-300 cursor-help"
              style={{
                strokeWidth: hoveredIndex === idx ? '32' : '30',
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

function MetricCard({ data }: { data: MetricData | any }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Support both legacy "type" and new "id"
  const metricId = data.id || data.type;
  const config = RESOURCE_MAP[metricId] || RESOURCE_MAP.default;
  const Icon = config.icon;

  // Resolve value from Cloudflare-style MetricGroup
  const displayValue = data.value !== undefined 
    ? data.value 
    : (data.count !== undefined ? data.count : (data.sum !== undefined ? data.sum : data.avg));

  const subtextColor =
    data.status === "critical"
      ? "text-red-600 font-semibold"
      : data.status === "warning"
        ? "text-amber-600 font-semibold"
        : "text-slate-500";

  // Gradient selection based on data type
  const getGradient = (type: string) => {
    if (type.includes("failed") || type.includes("sla")) return "from-red-50 to-white";
    if (type.includes("success")) return "from-emerald-50 to-white";
    if (type.includes("total_tables") || type.includes("total_jobs")) return "from-sky-50 to-white";
    return "from-slate-50 to-white";
  };

  return (
    <Card className={`group relative overflow-hidden border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 bg-gradient-to-br ${getGradient(data.type)}`}>
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <CardDescription className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500/80">
            <div className={`p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3`}>
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            </div>
            {data.label || config.label}
          </CardDescription>
          
          {data.breakdown && (
            <MetricPie data={data.breakdown} />
          )}
        </div>
        
        <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-primary transition-colors mt-2">
          {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <p className={`text-xs flex items-center gap-1.5 ${subtextColor}`}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" />
          {data.subtext}
        </p>

        {data.breakdown && data.breakdown.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              <span>DETAILS</span>
              <Activity className={`h-3 w-3 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`flex flex-col gap-1.5 transition-all duration-300 ease-in-out origin-top overflow-hidden ${isExpanded ? "max-h-24 opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"}`}>
              {data.breakdown.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.color || "bg-slate-300"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {/* Subtle Background Accent */}
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
          <Icon className="w-24 h-24" />
      </div>
    </Card>
  );
}

interface SummaryGridProps {
  metrics: MetricData[] | any[];
  cols?: number;
}

export function SummaryGrid({ metrics, cols = 5 }: SummaryGridProps) {
  const gridColsClass = {
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
  }[cols] || "lg:grid-cols-5";

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${gridColsClass} gap-5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      {metrics.map((m, idx) => (
        <MetricCard key={`${m.type}-${idx}`} data={m} />
      ))}
    </div>
  );
}

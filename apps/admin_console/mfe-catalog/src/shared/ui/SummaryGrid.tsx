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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";

// 1. 공통 메트릭 데이터 타입
export interface MetricData {
  type: string;
  value: number | string;
  subtext: string;
  status?: "default" | "warning" | "critical";
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
  
  default: { label: "Metric", icon: Activity, color: "text-slate-400" },
};

function MetricCard({ data }: { data: MetricData }) {
  const config = RESOURCE_MAP[data.type] || RESOURCE_MAP.default;
  const Icon = config.icon;

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
        <CardDescription className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500/80">
          <div className={`p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          </div>
          {config.label}
        </CardDescription>
        <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900 group-hover:text-primary transition-colors">
          {typeof data.value === "number" ? data.value.toLocaleString() : data.value}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className={`text-xs flex items-center gap-1.5 ${subtextColor}`}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" />
          {data.subtext}
        </p>
      </CardContent>
      {/* Subtle Background Accent */}
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
          <Icon className="w-24 h-24" />
      </div>
    </Card>
  );
}

interface SummaryGridProps {
  metrics: MetricData[];
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

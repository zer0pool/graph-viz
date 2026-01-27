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
} from "../ui/card";

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

const MetricCard: React.FC<{ data: MetricData }> = ({ data }) => {
  const config = RESOURCE_MAP[data.type] || RESOURCE_MAP.default;
  const Icon = config.icon;

  const subtextColor =
    data.status === "critical"
      ? "text-red-600 font-medium"
      : data.status === "warning"
        ? "text-orange-600 font-medium"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          {config.label}
        </CardDescription>
        <CardTitle className="text-3xl">
          {typeof data.value === "number" ? data.value.toLocaleString() : data.value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-sm ${subtextColor}`}>{data.subtext}</p>
      </CardContent>
    </Card>
  );
};

interface SummaryGridProps {
  metrics: MetricData[];
  cols?: number;
}

export const SummaryGrid: React.FC<SummaryGridProps> = ({ metrics, cols = 5 }) => {
  const gridColsClass = {
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
  }[cols] || "lg:grid-cols-5";

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-4 mb-6`}>
      {metrics.map((m, idx) => (
        <MetricCard key={`${m.type}-${idx}`} data={m} />
      ))}
    </div>
  );
};

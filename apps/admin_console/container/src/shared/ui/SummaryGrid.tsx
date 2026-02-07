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
} from "lucide-react";

// 1. Common Metric Data Type
export interface MetricData {
  type: string;
  value: number | string;
  subtext: string;
  status?: "default" | "warning" | "critical";
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

function MetricCard({ data }: { data: MetricData }) {
  const config = RESOURCE_MAP[data.type] || RESOURCE_MAP.default;
  const Icon = config.icon;

  const subtextColor =
    data.status === "critical"
      ? "text-red-600 font-medium"
      : data.status === "warning"
        ? "text-orange-600 font-medium"
        : "text-gray-500";

  return (
    <Card className="p-5">
      <div className="flex flex-col space-y-1.5 pb-3">
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          {config.label}
        </p>
        <h3 className="text-3xl font-bold tracking-tight text-gray-900">
          {typeof data.value === "number" ? data.value.toLocaleString() : data.value}
        </h3>
      </div>
      <div>
        <p className={`text-sm ${subtextColor}`}>{data.subtext}</p>
      </div>
    </Card>
  );
}

interface SummaryGridProps {
  metrics: MetricData[];
  cols?: number;
}

export function SummaryGrid({ metrics, cols = 4 }: SummaryGridProps) {
  const gridColsClass = {
    4: "md:grid-cols-4",
    5: "lg:grid-cols-5",
  }[cols] || "md:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 ${gridColsClass} gap-4 mb-6`}>
      {metrics.map((m, idx) => (
        <MetricCard key={`${m.type}-${idx}`} data={m} />
      ))}
    </div>
  );
}

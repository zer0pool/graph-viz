import { SummaryGrid, MetricData } from "../../shared/ui/SummaryGrid";

interface JobSummaryProps {
  metrics: MetricData[];
  loading?: boolean;
}

export function JobSummary({ metrics, loading }: JobSummaryProps) {
  if (loading && (!metrics || metrics.length === 0)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return null; // Don't show anything if really empty after load
  }

  return <SummaryGrid metrics={metrics} />;
}

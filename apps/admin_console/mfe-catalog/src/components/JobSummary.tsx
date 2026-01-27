import React from "react";
import { SummaryGrid, MetricData } from "./common/SummaryGrid";

export function JobSummary() {
  const metrics: MetricData[] = [
    {
      type: "total_jobs",
      value: 1250,
      subtext: "+12 this week",
    },
    {
      type: "success_execution",
      value: 1180,
      subtext: "Last 24 hours",
    },
    {
      type: "failed_execution",
      value: 45,
      subtext: "Requires attention",
      status: "critical",
    },
    {
      type: "expiring_soon",
      value: 12,
      subtext: "< 7 days",
    },
    {
      type: "sla_breach",
      value: 5,
      subtext: "Critical delay",
      status: "critical",
    },
  ];

  return <SummaryGrid metrics={metrics} />;
}

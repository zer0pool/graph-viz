import { useState, useEffect, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { Job } from "../../shared/types/job";
import { MetricData } from "../../shared/ui/SummaryGrid";
import { MetricEntry } from "../../shared/types";

export type { Job };

export type JobMetric = MetricData;

export function useJobLanding() {
  const api = useApiClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<JobMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Summary Metrics
      const summary = await api.fetchSummaryMetrics();
      
      // 2. Fetch Jobs
      const data = await api.fetchJobs(10, 0);
      const jobsList = data.jobs || data || [];
      
      // 3. Transform Summary into JobMetrics
      const metricsList = summary?.metrics || [];
      const findMetric = (type: string) => metricsList.find((m: MetricEntry) => m.type === type);

      const getMetricVal = (type: string) => findMetric(type)?.value || 0;
      const getMetricSub = (type: string, def: string) => findMetric(type)?.subtext || def;

      const formattedMetrics: JobMetric[] = [
        { 
          type: "total_jobs", 
          value: getMetricVal("total_jobs"), 
          subtext: getMetricSub("total_jobs", "Active Jobs")
        },
        { 
          type: "success_execution", 
          value: getMetricVal("success_jobs"), 
          subtext: getMetricSub("success_jobs", "Last 24 hours")
        },
        { 
          type: "failed_execution", 
          value: getMetricVal("failed_jobs"), 
          subtext: getMetricSub("failed_jobs", "Everything clean"),
          status: (Number(getMetricVal("failed_jobs")) > 0) ? "critical" : "default"
        },
        { 
          type: "expiring_soon", 
          value: getMetricVal("jobs_expiring"), 
          subtext: getMetricSub("jobs_expiring", "< 7 days left")
        },
        { 
          type: "sla_breach", 
          value: getMetricVal("job_sla_breaches"), 
          subtext: getMetricSub("job_sla_breaches", "Critical delay"),
          status: (Number(getMetricVal("job_sla_breaches")) > 0) ? "critical" : "default"
        }
      ];

      setMetrics(formattedMetrics);
      setJobs(Array.isArray(jobsList) ? jobsList : []);
    } catch (err: any) {
      console.error("[useJobLanding] Error fetching data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || "";
    if (s.includes("SUCCESS") || s.includes("COMPLETED")) return "text-green-600 bg-green-50";
    if (s.includes("RUNNING") || s.includes("PENDING")) return "text-blue-600 bg-blue-50";
    if (s.includes("FAILED") || s.includes("ERROR")) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  return {
    jobs,
    metrics,
    loading,
    error,
    refresh: fetchData,
    getStatusColor,
  };
}

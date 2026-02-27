import { useState, useEffect, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { Job } from "../../shared/types/job";
import { MetricData } from "../../shared/ui/SummaryGrid";
import { MetricEntry } from "../../shared/types";

export type { Job };

export type JobMetric = MetricData;

import { useLandingPageData } from "../../shared/hooks/useLandingPageData";

export function useJobLanding() {
  const { 
    metrics, 
    entities, 
    loading, 
    error, 
    refresh 
  } = useLandingPageData("jobs", { first: 20 });

  const jobs = (entities?.edges || []).map(edge => edge.node as Job);

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
    error: error ? error.message : null,
    refresh,
    getStatusColor,
  };
}

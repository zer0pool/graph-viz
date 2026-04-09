import { useState, useEffect, useMemo } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { ImpactAnalysisResponse } from "../../shared/api/types/lineage";
import { ImpactRow } from "./types";

function buildRows(response: ImpactAnalysisResponse): ImpactRow[] {
  const rows: ImpactRow[] = [];

  for (const entry of response.downstream) {
    // Table row
    const parts = entry.table.split(".");
    const path = parts.slice(0, -1);
    rows.push({
      id: `table:${entry.table}`,
      type: "Table",
      name: entry.table,
      path,
      steward: "None",
      distance: entry.depth,
      writerJobs: entry.writer_jobs,
    });

    // Job rows
    for (const job of entry.writer_jobs) {
      rows.push({
        id: `job:${job}@${entry.depth}`,
        type: "Job",
        name: job,
        path: [],
        steward: "None",
        distance: entry.depth,
        targetTable: entry.table,
      });
    }
  }

  return rows;
}

export function useImpactAnalysis(tableName: string, maxDepth: number) {
  const [response, setResponse] = useState<ImpactAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!tableName) return;
    let active = true;
    setLoading(true);
    setError(null);

    api
      .fetchTableImpact(tableName, { maxDepth, includeJobs: true })
      .then((data) => {
        if (active) {
          setResponse(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load impact analysis");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [tableName, maxDepth, api]);

  const allRows = useMemo(() => (response ? buildRows(response) : []), [response]);

  const sources = useMemo(() => {
    const jobNames = new Set<string>();
    for (const row of allRows) {
      if (row.type === "Table" && row.writerJobs) {
        row.writerJobs.forEach((j) => jobNames.add(j));
      }
    }
    return Array.from(jobNames).sort();
  }, [allRows]);

  return { allRows, sources, loading, error };
}

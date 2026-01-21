import { useState, useEffect } from "react";
import { useApiClient } from "./useApiClient";
import { TableLineageSummary } from "../types/table";

export const useTableLineage = (tableName: string) => {
  const [lineage, setLineage] = useState<TableLineageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();

  useEffect(() => {
    let active = true;
    const loadLineage = async () => {
      if (!tableName) return;
      setLoading(true);
      try {
        const response = await api.fetchTableLineageSummary(tableName);
        // Handle {status, result} wrapper or direct object
        const data = response.result || response;
        if (active) {
          setLineage(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError("Failed to load table lineage");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLineage();
    return () => {
      active = false;
    };
  }, [tableName, api]);

  return { lineage, loading, error };
};

import { useState, useEffect, useCallback, useMemo } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { datasetsData } from "../../shared/api/mockData";

export function useDatasetsTable() {
  const api = useApiClient();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchTables(50, 0);
      const tables = data.tables || data || [];
      setDatasets(tables.length > 0 ? tables : datasetsData);
    } catch (err) {
      console.error("[Detail MFE] Error fetching datasets:", err);
      setDatasets(datasetsData);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const maxSize = useMemo(() => {
    if (datasets.length === 0) return 0;
    return Math.max(...datasets.map((d) => d.storage_info?.size_bytes || d.sizeBytes || 0));
  }, [datasets]);

  return {
    datasets,
    maxSize,
    loading,
    refresh: fetchDatasets,
  };
}

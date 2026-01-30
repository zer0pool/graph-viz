import { useState, useEffect, useMemo, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import { datasetsData } from "../../shared/api/mockData";

export function useDatasetsTable() {
  const api = useApiClient();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetchTables(50, 0);
      const tables = data.tables || data || [];
      setDatasets(tables.length > 0 ? tables : datasetsData);
    } catch (err) {
      console.error("[useDatasetsTable] Error fetching datasets:", err);
      setDatasets(datasetsData);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const filteredDatasets = useMemo(() => {
    if (!search) return datasets;
    return datasets.filter((d) =>
      (d.name || d.full_name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, datasets]);

  const maxSize = useMemo(() => {
    if (datasets.length === 0) return 0;
    return Math.max(...datasets.map((d) => d.storage_info?.size_bytes || 0));
  }, [datasets]);

  return {
    search,
    setSearch,
    filteredDatasets,
    maxSize,
    loading,
  };
}

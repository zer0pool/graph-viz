import { useState, useEffect } from "react";
import { TableDetail } from "../../../shared/types/table";
import { useApiClient } from "../../../shared/api/ApiContext";

export function useTableOverview(tableName: string) {
  const [table, setTable] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!tableName) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchTableDetail(tableName)
      .then((data) => {
        if (mounted) {
          setTable(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [api, tableName]);

  return { table, loading, error };
}

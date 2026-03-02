import { useState, useEffect } from "react";
import { TableTimelinessResponse } from "../../../shared/types/table";
import { useApiClient } from "../../../shared/api/ApiContext";

export function useTableTimeliness(tableName: string, days: number = 7) {
  const [timeliness, setTimeliness] = useState<TableTimelinessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!tableName) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchTableTimeliness(tableName, days)
      .then((data) => {
        if (mounted) {
          setTimeliness(data);
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
  }, [api, tableName, days]);

  return { timeliness, loading, error };
}

import { useState, useEffect } from "react";
import { TableSchemaResponse } from "../../../shared/types/table";
import { useApiClient } from "../../../shared/api/ApiContext";

export function useTableSchema(tableName: string) {
  const [schema, setSchema] = useState<TableSchemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const api = useApiClient();

  useEffect(() => {
    if (!tableName) return;

    let mounted = true;
    setLoading(true);

    api
      .fetchTableSchema(tableName)
      .then((data) => {
        if (mounted) {
          setSchema(data);
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

  return { schema, loading, error };
}

import { useState, useCallback } from "react";
import { useApiClient } from "../../shared/api/ApiContext";
import {
  TableListItem,
  TableListResponse,
  TableRankingItem,
} from "../../shared/api/types/lineage";
import { MetricData } from "../../shared/ui/SummaryGrid";

export type TableMetric = MetricData;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const TABLE_LIST_QUERY = `
  query GetTableList(
    $offset: Int
    $limit: Int
    $sortOrder: SortOrder
    $filter: TableListFilter
  ) {
    tableList(offset: $offset, limit: $limit, sortOrder: $sortOrder, filter: $filter) {
      items {
        project
        dataset
        table
        lastModified
        sizeBytes
        rowsWritten
        writeMode
      }
      totalCount
    }
  }
`;

const TABLE_RANKING_QUERY = `
  query GetTableRanking($limit: Int) {
    tableSizeRanking(limit: $limit) {
      tableId project dataset table
      valueYesterday value7dAvg changePct history7d
    }
    tableRowsRanking(limit: $limit) {
      tableId project dataset table
      valueYesterday value7dAvg changePct history7d
    }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TableListFilter {
  table?: string;
  dataset?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTableLanding() {
  const api = useApiClient();

  const [tables, setTables] = useState<TableListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sizeRanking, setSizeRanking] = useState<TableRankingItem[]>([]);
  const [rowsRanking, setRowsRanking] = useState<TableRankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (options: {
      offset?: number;
      limit?: number;
      sortOrder?: "ASC" | "DESC";
      filter?: TableListFilter | null;
    } = {}) => {
      const { offset = 0, limit = 10, sortOrder = "DESC", filter = null } = options;

      setLoading(true);
      setError(null);
      try {
        const result = await api.graphqlRequest<{ tableList: TableListResponse }>(
          TABLE_LIST_QUERY,
          { offset, limit, sortOrder, filter }
        );
        setTables(result.tableList.items);
        setTotalCount(result.tableList.totalCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch table list");
        setTables([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const fetchRanking = useCallback(
    async (limit: number = 30) => {
      setRankingLoading(true);
      try {
        const result = await api.graphqlRequest<{
          tableSizeRanking: TableRankingItem[];
          tableRowsRanking: TableRankingItem[];
        }>(TABLE_RANKING_QUERY, { limit });
        setSizeRanking(result.tableSizeRanking ?? []);
        setRowsRanking(result.tableRowsRanking ?? []);
      } catch (err) {
        setSizeRanking([]);
        setRowsRanking([]);
      } finally {
        setRankingLoading(false);
      }
    },
    [api]
  );

  return {
    tables,
    totalCount,
    sizeRanking,
    rowsRanking,
    loading,
    rankingLoading,
    error,
    fetchData,
    fetchRanking,
    refresh: () => fetchData(),
  };
}

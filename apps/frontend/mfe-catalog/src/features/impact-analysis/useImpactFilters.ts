import { useState, useMemo, useEffect } from "react";
import { ImpactRow, ImpactFilters, DEFAULT_FILTERS } from "./types";

const PAGE_SIZE = 10;

export function useImpactFilters(allRows: ImpactRow[]) {
  const [filters, setFilters] = useState<ImpactFilters>({ ...DEFAULT_FILTERS });
  const [pendingMaxDistance, setPendingMaxDistance] = useState(DEFAULT_FILTERS.maxDistance);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when rows change (new API response)
  useEffect(() => {
    setCurrentPage(1);
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (filters.objectType !== "All" && row.type !== filters.objectType) return false;
      if (filters.source) {
        if (row.type === "Table") {
          if (!row.writerJobs?.includes(filters.source)) return false;
        } else {
          if (row.name !== filters.source) return false;
        }
      }
      return true;
    });
  }, [allRows, filters.objectType, filters.source]);

  // Reset page when filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows.length]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateFilter(partial: Partial<ImpactFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  // Returns the new committed filters; caller checks if maxDistance changed to trigger refetch
  function applyFilters(): ImpactFilters {
    const next: ImpactFilters = { ...filters, maxDistance: pendingMaxDistance };
    setFilters(next);
    return next;
  }

  return {
    filters,
    pendingMaxDistance,
    filteredRows,
    pagedRows,
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    updateFilter,
    setPendingMaxDistance,
    applyFilters,
    setPage: setCurrentPage,
  };
}

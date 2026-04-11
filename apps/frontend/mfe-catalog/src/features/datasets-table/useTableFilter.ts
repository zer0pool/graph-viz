import { useState, useMemo, useCallback, useEffect } from "react";

export const ITEMS_PER_PAGE = 10;

export interface TableFilterValues {
  search: string;
  services: string[];
  owners: string[];
  statuses: string[];
  hasDelayed: boolean;
  hasExpiring: boolean;
}

export interface TableFacets {
  services: string[];
  owners: string[];
  statuses: string[];
}

const DEFAULT_FILTERS: TableFilterValues = {
  search: "",
  services: [],
  owners: [],
  statuses: [],
  hasDelayed: false,
  hasExpiring: false,
};

export function useTableFilter(datasets: any[]) {
  const [filters, setFilters] = useState<TableFilterValues>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<TableFilterValues>(DEFAULT_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const facets = useMemo<TableFacets>(
    () => ({
      services: [...new Set(datasets.map((d) => d.service).filter(Boolean))].sort() as string[],
      owners: [...new Set(datasets.map((d) => d.owner).filter(Boolean))].sort() as string[],
      statuses: [...new Set(datasets.map((d) => d.status).filter(Boolean))].sort() as string[],
    }),
    [datasets]
  );

  const filteredDatasets = useMemo(() => {
    return datasets.filter((d) => {
      const name = (d.name || d.full_name || "").toLowerCase();
      if (filters.search && !name.includes(filters.search.toLowerCase())) return false;
      if (filters.services.length > 0 && !filters.services.includes(d.service)) return false;
      if (filters.owners.length > 0 && !filters.owners.includes(d.owner)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(d.status)) return false;
      if (filters.hasDelayed && !(d.delayed > 0)) return false;
      if (filters.hasExpiring && !(d.expiring > 0)) return false;
      return true;
    });
  }, [datasets, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredDatasets.length / ITEMS_PER_PAGE));

  const pagedDatasets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDatasets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDatasets, currentPage]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const setSearch = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(pendingFilters);
    setShowFilter(false);
  }, [pendingFilters]);

  const clearFilters = useCallback(() => {
    const cleared = { ...DEFAULT_FILTERS, search: filters.search };
    setPendingFilters(cleared);
    setFilters(cleared);
    setShowFilter(false);
  }, [filters.search]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.services.length > 0) count++;
    if (filters.owners.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.hasDelayed) count++;
    if (filters.hasExpiring) count++;
    return count;
  }, [filters]);

  return {
    ITEMS_PER_PAGE,
    filters,
    pendingFilters,
    setPendingFilters,
    showFilter,
    setShowFilter,
    facets,
    filteredDatasets,
    pagedDatasets,
    currentPage,
    setCurrentPage,
    totalPages,
    setSearch,
    applyFilters,
    clearFilters,
    activeFilterCount,
  };
}

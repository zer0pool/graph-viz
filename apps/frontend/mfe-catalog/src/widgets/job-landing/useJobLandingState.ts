import { useState, useMemo, useCallback } from "react";
import { JobRunFilterFacets } from "./useJobLanding";

const ITEMS_PER_PAGE = 10;

export type SortOrder = "ASC" | "DESC";

export interface SortState {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface FilterValues {
  jobId: string;
  dagId: string;
  types: string[];
  destination: string;
  owners: string[];
  issuers: string[];
  period: string;
  projects: string[];
  statuses: string[];
}

const DEFAULT_FILTERS: FilterValues = {
  jobId: "",
  dagId: "",
  types: [],
  destination: "",
  owners: [],
  issuers: [],
  period: "",
  projects: [],
  statuses: [],
};

const DEFAULT_SORT: SortState = { sortBy: "publish_time", sortOrder: "DESC" };

/** Compute the time-range ISO start/end for a preset label. */
function buildTimeRangeFilter(
  range: string,
  customSince: Date | null,
  customUntil: Date | null
): Record<string, string> {
  const until = new Date();
  const since = new Date();

  if (range === "1h") since.setHours(until.getHours() - 1);
  else if (range === "12h") since.setHours(until.getHours() - 12);
  else if (range === "1d") since.setDate(until.getDate() - 1);
  else if (range === "7d") since.setDate(until.getDate() - 7);
  else if (range === "30d") since.setDate(until.getDate() - 30);
  else if (range === "custom") {
    if (!customSince || !customUntil) return {};
    return {
      startedAtSince: customSince.toISOString(),
      startedAtUntil: customUntil.toISOString(),
    };
  }

  return {
    startedAtSince: since.toISOString(),
    startedAtUntil: until.toISOString(),
  };
}

export function useJobLandingState(
  facets: JobRunFilterFacets | null,
  onFetchData: (opts: {
    offset: number;
    limit: number;
    filter: Record<string, unknown> | null;
    sortBy: string;
    sortOrder: SortOrder;
  }) => void
) {
  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- Sorting ---
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);

  // --- Filters ---
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown> | null>(null);

  // --- Column visibility ---
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([]);

  // --- Multi-select search inputs ---
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [tempOwners, setTempOwners] = useState<string[]>([]);

  const [projectSearch, setProjectSearch] = useState("");
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [tempProjects, setTempProjects] = useState<string[]>([]);

  const [statusSearch, setStatusSearch] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [tempStatuses, setTempStatuses] = useState<string[]>([]);

  // --- Time range ---
  const [timeRange, setTimeRange] = useState("12h");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customRange, setCustomRange] = useState<{
    since: Date | null;
    until: Date | null;
  }>({ since: null, until: null });

  // --- Computed facet dropdowns ---
  const filteredOwners = useMemo(
    () =>
      (facets?.owners ?? []).filter((o) =>
        o.toLowerCase().includes(ownerSearch.toLowerCase())
      ),
    [facets?.owners, ownerSearch]
  );

  const filteredProjects = useMemo(
    () =>
      (facets?.projects ?? []).filter((p) =>
        p.toLowerCase().includes(projectSearch.toLowerCase())
      ),
    [facets?.projects, projectSearch]
  );

  const filteredStatuses = useMemo(
    () =>
      (facets?.statuses ?? []).filter((s) =>
        s.toLowerCase().includes(statusSearch.toLowerCase())
      ),
    [facets?.statuses, statusSearch]
  );

  // --- Derived pagination ---
  const totalPages = (totalCount: number) => Math.ceil(totalCount / ITEMS_PER_PAGE);

  // --- Handlers ---
  const handleSort = useCallback(
    (colId: string) => {
      setSortState((prev) => ({
        sortBy: colId,
        sortOrder: prev.sortBy === colId && prev.sortOrder === "DESC" ? "ASC" : "DESC",
      }));
      setCurrentPage(1);
    },
    []
  );

  const handleApplyCustomRange = useCallback(() => {
    setTimeRange("custom");
    setShowCustomRange(false);
  }, []);

  const handleApplyFilters = useCallback(() => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== ""
      )
    );
    setActiveFilters(Object.keys(clean).length > 0 ? clean : null);
    setCurrentPage(1);
    setShowFilter(false);
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveFilters(null);
    setCurrentPage(1);
    setShowFilter(false);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const getTimeRangeFilter = useCallback(
    () => buildTimeRangeFilter(timeRange, customRange.since, customRange.until),
    [timeRange, customRange.since, customRange.until]
  );

  return {
    ITEMS_PER_PAGE,
    // pagination
    currentPage,
    setCurrentPage,
    totalPages,
    handlePageChange,
    // sorting
    sortState,
    setSortState,
    handleSort,
    // filter panel
    showFilter,
    setShowFilter,
    filters,
    setFilters,
    activeFilters,
    handleApplyFilters,
    handleClearFilters,
    // column visibility
    showColumns,
    setShowColumns,
    visibleColumns,
    setVisibleColumns,
    tempVisibleColumns,
    setTempVisibleColumns,
    // owner search
    ownerSearch,
    setOwnerSearch,
    showOwnerDropdown,
    setShowOwnerDropdown,
    tempOwners,
    setTempOwners,
    filteredOwners,
    // project search
    projectSearch,
    setProjectSearch,
    showProjectDropdown,
    setShowProjectDropdown,
    tempProjects,
    setTempProjects,
    filteredProjects,
    // status search
    statusSearch,
    setStatusSearch,
    showStatusDropdown,
    setShowStatusDropdown,
    tempStatuses,
    setTempStatuses,
    filteredStatuses,
    // time range
    timeRange,
    setTimeRange,
    showCustomRange,
    setShowCustomRange,
    customRange,
    setCustomRange,
    handleApplyCustomRange,
    getTimeRangeFilter,
  };
}

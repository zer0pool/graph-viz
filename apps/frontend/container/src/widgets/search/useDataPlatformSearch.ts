/**
 * Custom Hook: useDataPlatformSearch
 *
 * Encapsulates all search logic including:
 * - Query filtering and type filtering
 * - Recent searches with localStorage
 * - Result counting by type
 * - API integration
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SearchFilters, SearchItem, Job, Table, DataUser, SearchType } from './types';
import { config } from '../../shared/api/config';

const RECENT_SEARCHES_KEY = 'dataplatform_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_PREVIEW_COUNT = 3; // Number of items to show before "Show More"

// Parse search query to extract type filter and search term
// Examples: "table:audit" → {type: 'table', query: 'audit'}
//           "t:audit" → {type: 'table', query: 'audit'} (shorthand)
//           "job:etl" → {type: 'job', query: 'etl'}
//           "j:etl" → {type: 'job', query: 'etl'} (shorthand)
//           "user:john" → {type: 'user', query: 'john'}
//           "u:john" → {type: 'user', query: 'john'} (shorthand)
//           "audit" → {type: 'all', query: 'audit'}
const parseSearchQuery = (input: string): { type: SearchType | 'all'; query: string } => {
  const typeMatch = input.match(/^(t|table|u|user|j|job):\s*(.*)$/i);

  if (typeMatch) {
    // Normalize shorthand types to full names
    const typeShorthand = typeMatch[1].toLowerCase();
    const typeMap: Record<string, SearchType> = {
      t: 'table',
      table: 'table',
      u: 'user',
      user: 'user',
      j: 'job',
      job: 'job',
    };
    const type = typeMap[typeShorthand] as SearchType;
    const query = typeMatch[2].trim();
    return { type, query };
  }

  return { type: 'all', query: input.trim() };
};

export const useDataPlatformSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    rawInput: '',
    query: '',
    type: 'all',
  });
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('[GlobalSearch] Error loading recent searches:', error);
      return [];
    }
  });
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<SearchType, boolean>>({
    job: false,
    table: false,
    user: false,
  });
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Convert API response to search items with deduplication
  const convertApiResponseToItems = useCallback((data: any): SearchItem[] => {
    const itemsMap = new Map<string, SearchItem>(); // Key: "type:id"

    // Process jobs with deduplication
    if (data.jobs?.length > 0) {
      data.jobs.forEach((job: any) => {
        const jobId = job.job_id || job.id;
        const key = `job:${jobId}`;

        if (!itemsMap.has(key)) {
          // Handle owners as array or string
          const ownerList = job.owners || job.owner;
          const ownerString = Array.isArray(ownerList)
            ? ownerList.join(', ')
            : ownerList || 'Unknown';

          itemsMap.set(key, {
            id: jobId,
            name: job.name || job.job_id || job.id,
            type: 'job',
            description: job.description || '',
            status: job.status || 'pending',
            owner: ownerString,
            lastExecuted: job.last_executed,
            duration: job.duration,
            relevanceScore: job.relevance_score,
          } as Job);
        }
      });
    }

    // Process tables with deduplication
    if (data.tables?.length > 0) {
      data.tables.forEach((table: any) => {
        const tableId = table.table_name || table.id || table.full_name;
        const key = `table:${tableId}`;

        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: tableId,
            name: table.table_name || table.name || table.full_name || table.id,
            type: 'table',
            description: table.description || '',
            rowCount: table.row_count,
            columnCount: table.column_count,
            database: table.database,
            lastUpdated: table.last_updated,
            owner: table.owner,
            relevanceScore: table.relevance_score,
          } as Table);
        }
      });
    }

    // Process users with deduplication
    const users = data.users || data.owners || [];
    if (users.length > 0) {
      users.forEach((user: any) => {
        const userName = typeof user === 'string' ? user : (user.user_id || user.name || user.login_id || String(user));
        const key = `user:${userName}`;

        if (!itemsMap.has(key)) {
          // Handle roles - can be array or single value
          const roleList = user.roles || [user.role] || ['viewer'];
          const roleString = Array.isArray(roleList)
            ? roleList[0]?.toLowerCase() || 'viewer'
            : (roleList?.toLowerCase() || 'viewer');

          itemsMap.set(key, {
            id: userName,
            name: user.name || userName,
            type: 'user',
            email: user.email || '',
            role: roleString,
            department: user.department || '',
            lastActive: user.last_login_at || user.last_active || new Date().toISOString(),
            status: (user.status || 'active').toLowerCase(),
          } as DataUser);
        }
      });
    }

    return Array.from(itemsMap.values());
  }, []);

  // Perform actual search
  const performSearch = useCallback(
    async (query: string, type?: SearchType | 'all') => {
      console.log('[GlobalSearch] performSearch called with:', { query, type });

      if (query.length < 2) {
        console.log('[GlobalSearch] Query too short, skipping search');
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Build URL with query and optional type parameter
        const baseUrl = `${config.BASE_URL}/lineage-manager/api/v1/search`;
        const url = new URL(baseUrl, window.location.origin);
        url.searchParams.set('q', query);

        // If type is specified and not 'all', include it in the request
        if (type && type !== 'all') {
          url.searchParams.set('type', type);
        }

        console.log('[GlobalSearch] Fetching from:', url.toString());

        const response = await fetch(url.toString());

        console.log('[GlobalSearch] Response status:', response.status);

        if (!response.ok) {
          console.error('[GlobalSearch] API returned non-OK status:', response.status);
          setSearchResults([]);
          return;
        }

        const data = await response.json();
        console.log('[GlobalSearch] API response data:', data);

        const items = convertApiResponseToItems(data);
        console.log('[GlobalSearch] Converted items:', items);

        setSearchResults(items);

        // Save to recent searches (use rawInput to preserve type filter syntax)
        // Note: rawInput is passed through the closure, so we need to get it from filters
      } catch (error) {
        console.error('[GlobalSearch] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [convertApiResponseToItems]
  );

  // Save recent search when search completes successfully
  useEffect(() => {
    if (searchResults.length > 0 && filters.rawInput.trim().length > 0) {
      setRecentSearches((prev) => {
        // Use rawInput to preserve type filter syntax (e.g., "table:audit")
        if (!prev.includes(filters.rawInput)) {
          const updated = [filters.rawInput, ...prev].slice(0, MAX_RECENT_SEARCHES);
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [filters.rawInput, searchResults.length]);

  // Reset selectedItemIndex when search results change
  useEffect(() => {
    setSelectedItemIndex(0);
  }, [filters.query]);

  // Filter results by type and sort by relevance score
  const filteredResults = useMemo(() => {
    let items = searchResults;

    if (filters.type !== 'all') {
      items = items.filter((item) => item.type === filters.type);
    }

    // Sort by relevance score (descending), then by name (ascending)
    return items.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;

      // If scores are different, sort by score descending
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // If scores are the same, sort by name ascending
      return a.name.localeCompare(b.name);
    });
  }, [searchResults, filters.type]);

  // Group results by type with expand/collapse support
  const groupedResults = useMemo(() => {
    const groups: Record<SearchType, SearchItem[]> = {
      job: [],
      table: [],
      user: [],
    };

    filteredResults.forEach((item) => {
      groups[item.type].push(item);
    });

    // Create display format with preview and total counts
    return {
      job: {
        all: groups.job,
        display: expandedGroups.job ? groups.job : groups.job.slice(0, MAX_PREVIEW_COUNT),
        total: groups.job.length,
        hasMore: groups.job.length > MAX_PREVIEW_COUNT && !expandedGroups.job,
      },
      table: {
        all: groups.table,
        display: expandedGroups.table ? groups.table : groups.table.slice(0, MAX_PREVIEW_COUNT),
        total: groups.table.length,
        hasMore: groups.table.length > MAX_PREVIEW_COUNT && !expandedGroups.table,
      },
      user: {
        all: groups.user,
        display: expandedGroups.user ? groups.user : groups.user.slice(0, MAX_PREVIEW_COUNT),
        total: groups.user.length,
        hasMore: groups.user.length > MAX_PREVIEW_COUNT && !expandedGroups.user,
      },
    };
  }, [filteredResults, expandedGroups]);

  // Calculate counts by type
  const counts = useMemo((): Record<SearchType | 'all', number> => {
    return {
      all: searchResults.length,
      job: searchResults.filter((item) => item.type === 'job').length,
      table: searchResults.filter((item) => item.type === 'table').length,
      user: searchResults.filter((item) => item.type === 'user').length,
    };
  }, [searchResults]);

  // Handle query change with debouncing
  const handleQueryChange = useCallback((input: string) => {
    console.log('[GlobalSearch] handleQueryChange called with input:', input);

    // Parse the input to extract type filter if present
    const { type, query } = parseSearchQuery(input);
    console.log('[GlobalSearch] parseSearchQuery result:', { type, query });

    setFilters((prev) => ({ ...prev, rawInput: input, query, type }));

    // Clear existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Set new timer for debounced search
    searchTimerRef.current = setTimeout(() => {
      console.log('[GlobalSearch] Debounce timer fired, calling performSearch');
      performSearch(query, type);
    }, SEARCH_DEBOUNCE_MS);
  }, [performSearch]);

  // Handle type filter change
  const handleTypeChange = useCallback((type: SearchType | 'all') => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({ rawInput: '', query: '', type: 'all' });
    setSearchResults([]);
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  // Remove single recent search
  const removeRecentSearch = useCallback((search: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== search);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((type: SearchType) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }, []);

  // Handle arrow key navigation
  const handleArrowUp = useCallback(() => {
    setSelectedItemIndex((prev) => {
      const newIndex = prev - 1;
      return newIndex < 0 ? filteredResults.length - 1 : newIndex;
    });
  }, [filteredResults.length]);

  const handleArrowDown = useCallback(() => {
    setSelectedItemIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= filteredResults.length ? 0 : newIndex;
    });
  }, [filteredResults.length]);

  // Get selected item
  const selectedItem = filteredResults[selectedItemIndex] || null;

  // Get auto-fill suggestion (first matching item's name)
  const autoFillSuggestion = useMemo(() => {
    if (!filters.query || filteredResults.length === 0) {
      return '';
    }

    const firstResult = filteredResults[0];
    const suggestion = firstResult.name;

    // Only suggest if the first result starts with the query
    if (suggestion.toLowerCase().startsWith(filters.query.toLowerCase())) {
      return suggestion.slice(filters.query.length);
    }

    return '';
  }, [filters.query, filteredResults]);

  // Apply auto-fill suggestion
  const applyAutoFill = useCallback(() => {
    if (autoFillSuggestion && filteredResults.length > 0) {
      const newQuery = filters.query + autoFillSuggestion;
      setFilters((prev) => ({ ...prev, rawInput: newQuery, query: newQuery }));

      // Optionally perform search with the completed query
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      performSearch(newQuery, filters.type);
    }
  }, [autoFillSuggestion, filters.query, filteredResults, filters.type, performSearch]);

  return {
    filters,
    results: {
      items: filteredResults,
      total: searchResults.length,
      counts,
    },
    groupedResults,
    recentSearches,
    isSearching,
    handleQueryChange,
    handleTypeChange,
    resetFilters,
    clearRecentSearches,
    removeRecentSearch,
    autoFillSuggestion,
    applyAutoFill,
    toggleGroup,
    expandedGroups,
    selectedItemIndex,
    selectedItem,
    handleArrowUp,
    handleArrowDown,
  };
};

export type UseDataPlatformSearchReturn = ReturnType<typeof useDataPlatformSearch>;

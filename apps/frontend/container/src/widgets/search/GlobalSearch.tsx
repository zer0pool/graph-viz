/**
 * GlobalSearch Component
 *
 * Enhanced search widget with:
 * - Real-time search across jobs, tables, and users
 * - Recent searches with localStorage
 * - Result count badges
 * - Type filtering
 * - Improved UX (loading states, empty states)
 * - Keyboard shortcuts (/ to open, Esc to close)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDataPlatformSearch } from './useDataPlatformSearch';
import { SearchItem, SearchType } from './types';
import '../../styles/components/SearchBox.css';

interface SearchBoxProps {
  onSelectSuggestion: (suggestion: SearchItem) => void;
  onSearch?: (query: string, firstResult?: SearchItem) => void;
}

export function SearchBox({ onSelectSuggestion, onSearch }: SearchBoxProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    filters,
    results,
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
  } = useDataPlatformSearch();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts: "/" to open, "Esc" to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.contentEditable === 'true';

      if (e.key === '/' && !showDropdown && !isInputField) {
        e.preventDefault();
        setShowDropdown(true);
        inputRef.current?.focus();
      }

      if (e.key === 'Escape' && showDropdown) {
        e.preventDefault();
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown]);

  const handleSelectItem = useCallback(
    (item: SearchItem) => {
      onSelectSuggestion(item);
      handleQueryChange('');
      setShowDropdown(false);
      setShowRecentOnly(false);
    },
    [onSelectSuggestion, handleQueryChange]
  );

  const handleRecentSearchClick = useCallback(
    (search: string) => {
      handleQueryChange(search);
      setShowRecentOnly(false);
    },
    [handleQueryChange]
  );

  const displayResults = showRecentOnly && !filters.query ? [] : results.items;
  const hasResults = displayResults.length > 0;
  const hasRecentSearches = recentSearches.length > 0;
  const shouldShowRecent = showRecentOnly && !filters.query && hasRecentSearches;

  return (
    <div ref={searchRef} id="search-bar-enhanced" className="search-bar-container">
      <svg id="search-icon" viewBox="0 0 16 16" className="search-icon">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"></path>
      </svg>

      {/* Input wrapper for autofill positioning */}
      <div className={`search-input-wrapper ${autoFillSuggestion ? 'has-autofill' : ''}`}>
        {/* Auto-fill suggestion overlay */}
        {autoFillSuggestion && (
          <div className="search-autofill-hint" aria-hidden="true">
            <span className="autofill-current">{filters.query}</span>
            <span className="autofill-suggestion">{autoFillSuggestion}</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          id="jobId"
          placeholder="Search... (t:table, u:user, j:job) or Press /"
          value={filters.rawInput}
          onChange={(e) => {
            console.log('[GlobalSearch] Input changed:', e.target.value);
            handleQueryChange(e.target.value);
            setShowRecentOnly(false);
          }}
          onFocus={() => {
            setShowDropdown(true);
            setShowRecentOnly(!filters.query);
          }}
          onKeyDown={(e) => {
            // Arrow up/down navigation
            if (e.key === 'ArrowUp' && results.items.length > 0) {
              e.preventDefault();
              handleArrowUp();
            }
            if (e.key === 'ArrowDown' && results.items.length > 0) {
              e.preventDefault();
              handleArrowDown();
            }
            // Auto-fill with Tab or ArrowRight
            if ((e.key === 'Tab' || e.key === 'ArrowRight') && autoFillSuggestion) {
              e.preventDefault();
              applyAutoFill();
            }
            // Submit search with Enter
            if (e.key === 'Enter') {
              if (autoFillSuggestion && e.shiftKey) {
                // Shift+Enter: apply auto-fill instead of search
                e.preventDefault();
                applyAutoFill();
              } else if (onSearch && filters.query && selectedItem) {
                // Enter: perform search with selected result
                e.preventDefault();
                onSearch(filters.query, selectedItem);
              }
            }
          }}
          autoComplete="off"
          className="search-input"
        />
      </div>

      {filters.query && (
        <button
          onClick={() => {
            handleQueryChange('');
            setShowDropdown(false);
          }}
          className="clear-btn"
          title="Clear search"
        >
          ✕
        </button>
      )}

      <button
        id="loadBtn"
        onClick={() => {
          if (filters.query) {
            const firstResult = results.items.length > 0 ? results.items[0] : undefined;
            onSearch?.(filters.query, firstResult);
          }
        }}
        className="search-btn"
      >
        Search
      </button>

      {/* Dropdown Results */}
      {showDropdown && (
        <div id="search-dropdown" className="search-dropdown">
          {/* Recent Searches */}
          {shouldShowRecent && (
            <div className="dropdown-section recent-section">
              <div className="section-header">
                <span className="section-title">Recent Searches</span>
                {hasRecentSearches && (
                  <button
                    onClick={clearRecentSearches}
                    className="section-action"
                    title="Clear all recent searches"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="recent-items">
                {recentSearches.map((search) => (
                  <div
                    key={search}
                    className="recent-item"
                    onClick={() => handleRecentSearchClick(search)}
                  >
                    <span className="recent-text">{search}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(search);
                      }}
                      className="recent-remove"
                      title="Remove from recent"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type Filter */}
          {filters.query && !isSearching && (
            <div className="dropdown-section filter-section">
              <div className="type-filters">
                {(['all', 'job', 'table', 'user'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`filter-btn ${filters.type === type ? 'active' : ''}`}
                  >
                    <span className="filter-label">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    <span className="filter-count">{results.counts[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="dropdown-section loading-section">
              <div className="loading-spinner"></div>
              <span className="loading-text">Searching...</span>
            </div>
          )}

          {/* Grouped Search Results */}
          {!isSearching && filters.query && (
            <>
              {hasResults ? (
                <div className="dropdown-section results-section">
                  {/* Jobs Group */}
                  {(groupedResults.job.total > 0 || filters.type === 'all') && (
                    <div className="result-group">
                      <div className="group-header">
                        <span className="group-title">Jobs</span>
                        <span className="group-count">{groupedResults.job.total}</span>
                      </div>
                      <div className="group-items">
                        {groupedResults.job.display.map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item as typeof item)}
                            className={`result-item result-job ${isSelected ? 'first-result' : ''}`}
                          >
                            <div className="result-content">
                              <div className="result-header">
                                <div className="result-name">{item.name}</div>
                                {item.type === 'job' && item.status && item.status !== 'pending' && (
                                  <span className={`status-badge status-${item.status}`}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                )}
                              </div>
                              {item.type === 'job' && item.description && (
                                <div className="result-description">{item.description}</div>
                              )}
                              {item.type === 'job' && (item.owner || item.lastExecuted || item.duration) && (
                                <div className="result-meta">
                                  {item.owner && item.owner !== 'Unknown' && (
                                    <span className="meta-item">👤 {item.owner}</span>
                                  )}
                                  {item.lastExecuted && (
                                    <span className="meta-item">🕐 {item.lastExecuted}</span>
                                  )}
                                  {item.duration && (
                                    <span className="meta-item">⏱️ {item.duration}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="result-badge badge-job">Job</span>
                          </button>
                          );
                        })}
                      </div>
                      {groupedResults.job.total > 3 && (
                        <button
                          className="show-more-btn"
                          onClick={() => toggleGroup('job')}
                        >
                          {expandedGroups.job ? (
                            <>
                              ▲ Show less ({3} of {groupedResults.job.total})
                            </>
                          ) : (
                            <>
                              ▼ Show {groupedResults.job.total - 3} more job
                              {groupedResults.job.total - 3 !== 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tables Group */}
                  {(groupedResults.table.total > 0 || filters.type === 'all') && (
                    <div className="result-group">
                      <div className="group-header">
                        <span className="group-title">Tables</span>
                        <span className="group-count">{groupedResults.table.total}</span>
                      </div>
                      <div className="group-items">
                        {groupedResults.table.display.map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item as typeof item)}
                            className={`result-item result-table ${isSelected ? 'first-result' : ''}`}
                          >
                            <div className="result-content">
                              <div className="result-name">{item.name}</div>
                              {item.type === 'table' && item.description && (
                                <div className="result-description">{item.description}</div>
                              )}
                              {item.type === 'table' && (
                                <div className="result-meta">
                                  {item.database && (
                                    <span className="meta-item meta-badge">💾 {item.database}</span>
                                  )}
                                  {item.rowCount !== undefined && (
                                    <span className="meta-item">
                                      📊 {(item.rowCount / 1000).toFixed(1)}K rows
                                    </span>
                                  )}
                                  {item.columnCount && (
                                    <span className="meta-item">🔢 {item.columnCount} cols</span>
                                  )}
                                  {item.lastUpdated && (
                                    <span className="meta-item">🕐 {item.lastUpdated}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="result-badge badge-table">Table</span>
                          </button>
                          );
                        })}
                      </div>
                      {groupedResults.table.total > 3 && (
                        <button
                          className="show-more-btn"
                          onClick={() => toggleGroup('table')}
                        >
                          {expandedGroups.table ? (
                            <>
                              ▲ Show less ({3} of {groupedResults.table.total})
                            </>
                          ) : (
                            <>
                              ▼ Show {groupedResults.table.total - 3} more table
                              {groupedResults.table.total - 3 !== 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Users Group */}
                  {(groupedResults.user.total > 0 || filters.type === 'all') && (
                    <div className="result-group">
                      <div className="group-header">
                        <span className="group-title">Users</span>
                        <span className="group-count">{groupedResults.user.total}</span>
                      </div>
                      <div className="group-items">
                        {groupedResults.user.display.map((item) => {
                          const isSelected = selectedItem?.id === item.id;
                          return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item as typeof item)}
                            className={`result-item result-user ${isSelected ? 'first-result' : ''}`}
                          >
                            <div className="result-content">
                              <div className="result-header">
                                <div className="result-name">{item.name}</div>
                                {item.type === 'user' && item.status && (
                                  <span
                                    className={`status-badge status-${item.status === 'active' ? 'active' : 'inactive'}`}
                                  >
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                )}
                              </div>
                              {item.type === 'user' && item.email && (
                                <div className="result-email">{item.email}</div>
                              )}
                              {item.type === 'user' && (
                                <div className="result-meta">
                                  {item.role && (
                                    <span className={`meta-item role-badge role-${item.role}`}>
                                      {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                                    </span>
                                  )}
                                  {item.department && (
                                    <span className="meta-item">🏢 {item.department}</span>
                                  )}
                                  {item.lastActive && (
                                    <span className="meta-item">🕐 {item.lastActive}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="result-badge badge-user">User</span>
                          </button>
                          );
                        })}
                      </div>
                      {groupedResults.user.total > 3 && (
                        <button
                          className="show-more-btn"
                          onClick={() => toggleGroup('user')}
                        >
                          {expandedGroups.user ? (
                            <>
                              ▲ Show less ({3} of {groupedResults.user.total})
                            </>
                          ) : (
                            <>
                              ▼ Show {groupedResults.user.total - 3} more user
                              {groupedResults.user.total - 3 !== 1 ? 's' : ''}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="dropdown-section empty-section">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-text">No results found</div>
                  <div className="empty-hint">
                    Try searching for a job, table, or user name
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty Initial State */}
          {!filters.query && !showRecentOnly && (
            <div className="dropdown-section empty-section">
              <div className="empty-icon">⌨️</div>
              <div className="empty-text">Start searching</div>
              <div className="empty-hint">
                Type to search for jobs, tables, and users across the platform
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

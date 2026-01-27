import React, { useState, useRef, useEffect } from "react";
import { config } from "../config";
import "../styles/components/SearchBox.css";

interface SearchSuggestion {
  type: "job" | "table" | "owner";
  id: string;
  name: string;
}

interface SearchBoxProps {
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  onSearch?: (query: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ onSelectSuggestion, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const data = await response.json();
      const results: SearchSuggestion[] = [];

      if (data.jobs) {
        data.jobs.forEach((job: any) => {
          results.push({
            type: "job" as const,
            id: job.job_id || job.id,
            name: job.job_id || job.name || job.id,
          });
        });
      }

      if (data.tables) {
        data.tables.forEach((table: any) => {
          results.push({
            type: "table" as const,
            id: table.table_name || table.name || table.id,
            name: table.table_name || table.name || table.id,
          });
        });
      }

      if (data.owners) {
        data.owners.forEach((owner: string) => {
          results.push({
            type: "owner" as const,
            id: owner,
            name: owner,
          });
        });
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const internalOnSelect = (suggestion: SearchSuggestion) => {
    onSelectSuggestion(suggestion);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} id="search-bar">
      <svg id="search-icon" viewBox="0 0 16 16">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"></path>
      </svg>
      <input
        type="text"
        id="jobId"
        placeholder="Search job or table..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        autoComplete="off"
      />
      <button
        id="loadBtn"
        onClick={() => {
          if (searchQuery) {
            if (onSearch) {
              onSearch(searchQuery);
            } else {
              handleSearch(searchQuery);
            }
          }
        }}
      >
        Search
      </button>

      {showSuggestions && (
        <div id="suggestions" className="suggestions">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="suggestion-item"
              onClick={() => internalOnSelect(suggestion)}
            >
              <div className="suggestion-name">{suggestion.name}</div>
              <div className="suggestion-type">{suggestion.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { config } from "../config";

interface SearchSuggestion {
  type: "job" | "table";
  id: string;
  name: string;
}

export const Navbar: React.FC<{
  onSelectGraphNode: (node: any) => void;
}> = ({ onSelectGraphNode }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions from backend API
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Call backend search API
      const response = await fetch(
        `${config.API_BASE_URL}/api/v1/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        console.error("Search API failed:", response.status);
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const data = await response.json();

      // Transform backend response to SearchSuggestion format
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

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    // Navigate to lineage page
    onSelectGraphNode({ type: suggestion.type, id: suggestion.id });
    navigate("/lineage");
    setShowSuggestions(false);
    setSearchQuery("");
  };

  const handleLogin = () => {
    console.info("[Navbar] User clicked Sign in, initiating login flow");
    login();
  };

  return (
    <div
      id="navbar"
      style={{
        height: "var(--navbar-height, 48px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        backgroundColor: "#f6f8fa", // Light gray background (GCP style)
        color: "#24292f", // Dark text
        borderBottom: "1px solid #d0d7de",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        gap: "18px",
      }}
    >
      {/* Logo & Brand */}
      <a
        href="/"
        className="nav-brand"
        style={{
          display: "flex",
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <img
          src={`${config.BASE_URL}/images/logo.png`}
          alt="Pipeline Ops Console"
          className="nav-logo"
          style={{ height: "36px", objectFit: "contain" }}
        />
      </a>

      {/* Search Bar */}
      <div
        ref={searchRef}
        id="search-bar"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flex: 1,
          maxWidth: "500px",
          margin: "0 2rem",
        }}
      >
        <svg
          id="search-icon"
          viewBox="0 0 16 16"
          style={{ width: "16px", height: "16px", fill: "#94a3b8" }}
        >
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
          style={{
            flex: 1,
            padding: "6px",
            border: "1px solid #d0d7de",
            borderRadius: "6px",
            background: "#fff",
            color: "#24292f",
            outline: "none",
            fontSize: "14px",
          }}
        />
        <button
          id="loadBtn"
          onClick={() => searchQuery && handleSearch(searchQuery)}
          style={{
            padding: "6px 12px",
            background: "#1a73e8",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Search
        </button>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div
            id="suggestions"
            className="suggestions"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "0.25rem",
              background: "#fff",
              color: "#1e293b",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              maxHeight: "300px",
              overflowY: "auto",
              zIndex: 1000,
            }}
          >
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(suggestion)}
                style={{
                  padding: "0.75rem",
                  cursor: "pointer",
                  borderBottom:
                    idx < suggestions.length - 1 ? "1px solid #e2e8f0" : "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ fontWeight: 500 }}>{suggestion.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {suggestion.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Controls */}
      <div id="user-controls" style={{ position: "relative" }} ref={profileRef}>
        {!user ? (
          <button
            id="login-btn"
            onClick={handleLogin}
            className="btn-primary"
            style={{
              padding: "6px 12px",
              background: "#1a73e8",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Sign in
          </button>
        ) : (
          <div
            id="user-chip"
            className="user-chip"
            onClick={() => setShowProfile(!showProfile)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              border: "1px solid #d0d7de",
              borderRadius: "999px",
              background: "#ffffff",
              cursor: "pointer",
              transition: "box-shadow 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#0969da";
              e.currentTarget.style.boxShadow =
                "0 1px 3px rgba(9, 105, 218, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#d0d7de";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <img
              id="user-avatar"
              src={
                user.picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name || user.email || user.sub
                )}&background=1a73e8&color=fff`
              }
              alt="User profile"
              style={{ width: "32px", height: "32px", borderRadius: "50%" }}
            />
            <span style={{ color: "#24292f", fontSize: "14px" }}>
              {user.name || user.preferred_username || user.email || user.sub}
            </span>
            <span
              className="caret"
              style={{ fontSize: "12px", color: "#57606a" }}
            >
              ▼
            </span>
          </div>
        )}

        {/* Profile Dropdown */}
        {user && showProfile && (
          <div
            id="profile-panel"
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "0.5rem",
              background: "#fff",
              color: "#1e293b",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              padding: "1rem",
              minWidth: "200px",
              zIndex: 1000,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <img
                src={
                  user.picture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name || user.email || user.sub
                  )}&background=3b82f6&color=fff&size=64`
                }
                alt="Profile"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  marginBottom: "0.5rem",
                }}
              />
              <h3 style={{ margin: 0, fontSize: "1rem" }}>
                {user.name || user.preferred_username}
              </h3>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {user.email}
              </div>
            </div>
            <button
              id="logout-btn"
              onClick={() => {
                logout();
                setShowProfile(false);
              }}
              className="btn-secondary"
              style={{
                width: "100%",
                padding: "0.5rem",
                background: "#e2e8f0",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

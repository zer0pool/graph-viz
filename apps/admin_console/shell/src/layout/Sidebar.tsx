import React from "react";
import { Link } from "react-router-dom";

export const Sidebar = () => (
  <aside
    style={{
      width: 200,
      background: "#ffffff",
      color: "#24292f",
      padding: 16,
      borderRight: "1px solid #d0d7de",
      boxShadow: "0 14px 25px rgba(15, 23, 42, 0.08)",
    }}
  >
    <div
      style={{
        marginBottom: 20,
        color: "#6b7280",
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
      }}
    >
      Navigation
    </div>
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <li>
        <Link
          to="/"
          style={{
            display: "block",
            color: "#24292f",
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f8fa")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          Dashboard
        </Link>
      </li>
      <li>
        <Link
          to="/lineage"
          style={{
            display: "block",
            color: "#24292f",
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f8fa")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          Lineage
        </Link>
      </li>
      <li>
        <Link
          to="/tables"
          style={{
            display: "block",
            color: "#24292f",
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f6f8fa")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          Tables
        </Link>
      </li>
    </ul>
  </aside>
);

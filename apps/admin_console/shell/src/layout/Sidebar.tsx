import React from "react";
import { Link } from "react-router-dom";
import "../styles/layout/Sidebar.css";

export const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-heading">Navigation</div>
    <ul className="sidebar-nav-list">
      <li>
        <Link to="/" className="sidebar-nav-link">
          Dashboard
        </Link>
      </li>
      <li>
        <Link to="/lineage" className="sidebar-nav-link">
          Lineage
        </Link>
      </li>
      <li>
        <Link to="/tables" className="sidebar-nav-link">
          Tables
        </Link>
      </li>
    </ul>
  </aside>
);

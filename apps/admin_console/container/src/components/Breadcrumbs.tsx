import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "../lib/utils";

const routeLabels: Record<string, string> = {
  jobs: "Jobs",
  tables: "Tables",
  lineage: "Data Lineage",
  users: "Users",
  audit: "Audit/Events",
  settings: "Settings",
  projects: "Projects",
  diag: "Diagnostics",
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // If we are on dashboard, maybe just "Console > Dashboard" or just "Console"
  const breadcrumbs: { label: string; path: string; icon?: any }[] = [
    { label: "Console", path: "/", icon: Home },
  ];

  pathnames.forEach((value, index) => {
    const last = index === pathnames.length - 1;
    const to = `/${pathnames.slice(0, index + 1).join("/")}`;

    // Check if it's a known route or a dynamic ID
    let label = routeLabels[value] || value;

    // Special handling for detail pages if needed (e.g. if previous was 'jobs' or 'tables')
    // But for now, using the value itself as ID is fine.

    breadcrumbs.push({ label, path: to, icon: null });
  });

  if (breadcrumbs.length === 1 && location.pathname === "/") {
    breadcrumbs[0].label = "Dashboard";
  } else if (breadcrumbs.length === 1) {
      // This case might be unnecessary if split filter works, but safe guard
  }

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 list-none p-0 m-0">
        {breadcrumbs.map((breadcrumb, index) => {
          const Icon = breadcrumb.icon;
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={breadcrumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1 shrink-0" />
              )}
              <div className="flex items-center">
                {isLast ? (
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                    {breadcrumb.label}
                  </span>
                ) : (
                  <Link
                    to={breadcrumb.path}
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-[#1a73e8] transition-colors no-underline"
                  >
                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                    {breadcrumb.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

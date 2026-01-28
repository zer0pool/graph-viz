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

import { Database, Settings, GitBranch, User, Bell, LayoutDashboard, Table, List } from "lucide-react";

const iconMap: Record<string, any> = {
  jobs: List,
  tables: Table,
  lineage: GitBranch,
  users: User,
  audit: Bell,
  dashboard: LayoutDashboard,
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbs: { label: string; path: string; icon?: any }[] = [
    { label: "Console", path: "/", icon: Home },
  ];

  pathnames.forEach((value, index) => {
    const prevValue = index > 0 ? pathnames[index - 1] : null;
    const to = `/${pathnames.slice(0, index + 1).join("/")}`;
    
    let label = routeLabels[value] || value;
    let Icon = iconMap[value];

    // Identify if current value is an ID based on context
    if (prevValue === 'jobs' || prevValue === 'tables' || prevValue === 'lineage') {
       // It's an ID
       if (prevValue === 'jobs') Icon = Settings;
       if (prevValue === 'tables') Icon = Database;
       if (prevValue === 'lineage') Icon = GitBranch;
       
       // Shorten if it's too long for the breadcrumb
       if (label.length > 20) {
          label = label.split('.').pop() || label;
       }
    }

    breadcrumbs.push({ label, path: to, icon: Icon });
  });

  if (breadcrumbs.length === 1 && location.pathname === "/") {
    breadcrumbs[0].label = "Dashboard";
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
                  <span className="flex items-center text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                     {Icon && <Icon className="w-4 h-4 mr-1" />}
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

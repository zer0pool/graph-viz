import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../shared/lib/utils";

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

import {
  Database,
  Settings,
  GitBranch,
  User,
  Users,
  Bell,
  LayoutDashboard,
  Table2,
  List,
  Briefcase,
  Boxes,
  Shield,
  ChevronRight,
  Home,
  LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  jobs: Briefcase,
  tables: Table2,
  lineage: GitBranch,
  users: Users,
  audit: Shield,
  dashboard: LayoutDashboard,
  projects: Boxes,
};

/**
 * Custom component to render two icons overlapping to represent "plural" entities.
 */
const StackedIcon = ({ icon: Icon, className }: { icon: LucideIcon; className?: string }) => (
  <div
    className="relative flex items-center justify-center mr-2 mb-0.5"
    style={{ width: "20px", height: "20px" }}
  >
    {/* Shadow/Back icon - lighter, slightly offset to top-right */}
    <Icon className={cn("w-4 h-4 text-gray-300 absolute top-0 right-0 opacity-70", className)} />
    {/* Primary icon - full size, offset to bottom-left to overlap heavily */}
    <Icon
      className={cn(
        "w-4 h-4 text-[#5f6368] absolute bottom-0 left-0 bg-white/80 rounded-[1px]",
        className
      )}
    />
  </div>
);

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbs: { label: string; path: string; icon?: LucideIcon; isStacked?: boolean }[] = [
    { label: "Console", path: "/", icon: Home },
  ];

  pathnames.forEach((value, index) => {
    const prevValue = index > 0 ? pathnames[index - 1] : null;
    const to = `/${pathnames.slice(0, index + 1).join("/")}`;

    let label = routeLabels[value] || value;
    let Icon = iconMap[value];
    let isStacked = false;

    // Plural logic: apply stacked effect to jobs/tables/projects list items
    if (value === "jobs" || value === "tables" || value === "projects") {
      isStacked = true;
    }

    // Prefix detection logic for IDs (e.g., job:name, table:name)
    if (label.includes(":")) {
      if (label.startsWith("job:")) {
        Icon = Briefcase;
        label = label.replace("job:", "");
      } else if (label.startsWith("table:")) {
        Icon = Table2;
        label = label.replace("table:", "");
      }
    }

    // Identify if current value is an ID based on context
    if (
      prevValue === "jobs" ||
      prevValue === "tables" ||
      prevValue === "lineage" ||
      prevValue === "users" ||
      prevValue === "projects"
    ) {
      // It's an ID
      if (!Icon) {
        // Only assign if not already set by prefix logic
        if (prevValue === "jobs") Icon = Briefcase;
        if (prevValue === "tables") Icon = Table2;
        if (prevValue === "lineage") Icon = GitBranch;
        if (prevValue === "users") Icon = User;
        if (prevValue === "projects") Icon = Boxes;
      }

      // Shorten if it's too long for the breadcrumb
      if (label.length > 20) {
        label = label.split(".").pop() || label;
      }
    }

    breadcrumbs.push({ label, path: to, icon: Icon, isStacked });
  });

  if (location.pathname === "/") {
    breadcrumbs.push({ label: "Dashboard", path: "/", icon: LayoutDashboard });
  }

  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 list-none p-0 m-0">
        {breadcrumbs.map((breadcrumb, index) => {
          const Icon = breadcrumb.icon;
          const isStacked = breadcrumb.isStacked;
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={`${breadcrumb.path}-${breadcrumb.label}`} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1 shrink-0" />}
              <div className="flex items-center">
                {isLast ? (
                  <span className="flex items-center text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                    {isStacked && Icon ? (
                      <StackedIcon icon={Icon} />
                    ) : (
                      Icon && <Icon className="w-4 h-4 mr-1" />
                    )}
                    {breadcrumb.label}
                  </span>
                ) : (
                  <Link
                    to={breadcrumb.path}
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-[#1a73e8] transition-colors no-underline"
                  >
                    {isStacked && Icon ? (
                      <StackedIcon icon={Icon} />
                    ) : (
                      Icon && <Icon className="w-4 h-4 mr-1" />
                    )}
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

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from '../../shared/lib/utils';

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

import { Database, Settings, GitBranch, User, Users, Bell, LayoutDashboard, Table2, List, Briefcase, Shield } from "lucide-react";

const iconMap: Record<string, any> = {
  jobs: Briefcase,
  tables: Table2,
  lineage: GitBranch,
  users: Users,
  audit: Shield,
  dashboard: LayoutDashboard,
};

/**
 * Custom component to render two icons overlapping to represent "plural" entities.
 */
const StackedIcon = ({ icon: Icon, className }: { icon: any; className?: string }) => (
  <div className="relative flex items-center justify-center mr-1" style={{ width: '20px', height: '18px' }}>
    <Icon className={cn("w-3 h-3 text-gray-300 absolute top-0 right-0", className)} />
    <Icon className={cn("w-3.5 h-3.5 text-gray-500 absolute bottom-0 left-0 bg-gray-50/50 rounded-sm", className)} />
  </div>
);

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  const breadcrumbs: { label: string; path: string; icon?: any; isStacked?: boolean }[] = [
    { label: "Console", path: "/", icon: Home },
  ];

  pathnames.forEach((value, index) => {
    const prevValue = index > 0 ? pathnames[index - 1] : null;
    const to = `/${pathnames.slice(0, index + 1).join("/")}`;
    
    let label = routeLabels[value] || value;
    let Icon = iconMap[value];
    let isStacked = false;

    // Plural logic: apply stacked effect to jobs/tables list items
    if (value === 'jobs' || value === 'tables') {
       isStacked = true;
    }

    // Identify if current value is an ID based on context
    if (prevValue === 'jobs' || prevValue === 'tables' || prevValue === 'lineage' || prevValue === 'users') {
       // It's an ID
       if (prevValue === 'jobs') Icon = Briefcase;
       if (prevValue === 'tables') Icon = Table2;
       if (prevValue === 'lineage') Icon = GitBranch;
       if (prevValue === 'users') Icon = User;
       
       // Shorten if it's too long for the breadcrumb
       if (label.length > 20) {
          label = label.split('.').pop() || label;
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
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1 shrink-0" />
              )}
              <div className="flex items-center">
                {isLast ? (
                  <span className="flex items-center text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                     {isStacked ? (
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
                     {isStacked ? (
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

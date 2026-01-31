import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Table2,
  GitBranch,
  Users,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from '../../shared/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Jobs", path: "/jobs", icon: Briefcase },
    { label: "Tables", path: "/tables", icon: Table2 },
    { label: "Data Lineage", path: "/lineage", icon: GitBranch },
    { label: "Users", path: "/users", icon: Users },
    { label: "Audit/Events", path: "/audit", icon: Shield },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "bg-white text-[#5f6368] border-r border-border shadow-[0_14px_25px_rgba(15,23,42,0.08)] overflow-y-auto flex flex-col shrink-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[64px]" : "w-[256px]",
      )}
    >
      <nav className="mt-2 text-center">
        <ul className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <li key={item.path} title={isCollapsed ? item.label : undefined}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center rounded-xl font-medium text-[14px] transition-all duration-200 no-underline h-10",
                    isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-[#e8f0fe] text-[#1a73e8]"
                      : "text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124]",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0",
                      isActive ? "text-[#1a73e8]" : "text-[#5f6368]",
                    )}
                  />
                  {!isCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden opacity-100 transition-opacity duration-300">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

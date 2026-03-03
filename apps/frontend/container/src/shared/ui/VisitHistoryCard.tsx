import React from "react";
import {
  ArrowRight,
  LucideIcon,
  Briefcase,
  Table2,
  Users,
  Building,
  FileText,
  Shield,
  Settings,
  LayoutDashboard,
  GitBranch,
} from "lucide-react";
import { config } from "../api/config";

export interface VisitHistoryItem {
  path: string;
  title: string;
  type?: string;
  meta: string; // "18 times" or "5 mins ago"
}

interface VisitHistoryCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  items: VisitHistoryItem[];
  loading?: boolean;
  emptyMessage?: string;
  onViewMore?: () => void;
}

export function VisitHistoryCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-500",
  items,
  loading = false,
  emptyMessage = "No history available",
  onViewMore,
}: VisitHistoryCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(items.length > 0);

  // Auto-collapse if empty and not loading, auto-expand if data arrives
  React.useEffect(() => {
    if (!loading && items.length > 0) {
      setIsExpanded(true);
    } else if (!loading && items.length === 0) {
      setIsExpanded(false);
    }
  }, [loading, items.length]);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${isExpanded ? "h-full" : "h-auto"}`}
    >
      {/* Header */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? "border-b border-gray-100" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="font-semibold flex items-center gap-2 text-gray-900">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {subtitle && <span className="text-xs text-gray-400 font-normal">{subtitle}</span>}
          <ArrowRight
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"}`}
          />
        </div>
      </div>

      {/* List Body */}
      {isExpanded && (
        <>
          <div className="p-2 flex-1">
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 animate-pulse">
                Loading...
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-1">
                {items.map((item, idx) => {
                  const getPageIcon = (type?: string) => {
                    switch (type) {
                      case "job":
                      case "jobs_landing":
                        return <Briefcase className="h-3.5 w-3.5 text-indigo-500" />;
                      case "table":
                      case "tables_landing":
                        return <Table2 className="h-3.5 w-3.5 text-emerald-500" />;
                      case "user":
                      case "users_landing":
                        return <Users className="h-3.5 w-3.5 text-orange-500" />;
                      case "project":
                      case "projects_landing":
                        return <Building className="h-3.5 w-3.5 text-blue-500" />;
                      case "lineage":
                        return <GitBranch className="h-3.5 w-3.5 text-fuchsia-500" />;
                      case "audit":
                        return <Shield className="h-3.5 w-3.5 text-purple-500" />;
                      case "settings":
                        return <Settings className="h-3.5 w-3.5 text-slate-500" />;
                      case "dashboard":
                        return <LayoutDashboard className="h-3.5 w-3.5 text-blue-600" />;
                      default:
                        return <FileText className="h-3.5 w-3.5 text-slate-400" />;
                    }
                  };

                  return (
                    <a
                      key={`${item.path}-${idx}`}
                      href={`${config.BASE_URL}${item.path}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                          {getPageIcon(item.type)}
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
                          {item.title || item.path}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded flex-shrink-0 border border-transparent group-hover:border-gray-200 transition-all uppercase tracking-tighter">
                        {item.meta}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="h-12 flex items-center justify-center text-gray-400 italic text-sm">
                {emptyMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-50 bg-gray-50/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewMore?.();
              }}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 ml-auto"
            >
              VIEW MORE <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

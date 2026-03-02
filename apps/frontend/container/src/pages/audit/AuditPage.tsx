import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { config } from '../../shared/api/config';
import { SummaryGrid, MetricData } from '../../shared/ui/SummaryGrid';

// --- Types (Matched with Backend Schemas) ---
type CommandStatus = "SUCCESS" | "PARTIAL" | "FAILED";
type EventStatus = "SUCCESS" | "FAILED" | "TIMEOUT";

interface AuditEvent {
  id: string;
  description: string;
  status: EventStatus;
  timestamp: string;
}

interface AuditCommand {
  id: string;
  timestamp: string;
  type: string;
  summary: string;
  actor: string;
  status: CommandStatus;
  incidentId?: string;
  relatedInfo?: string;
  events: AuditEvent[];
}

// --- UI Components (Inline for simplicity, mirroring Figma structure) ---
// In a real app, these should be imported from a shared UI library
const Badge = ({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) => {
  let baseClass =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  if (variant === "outline") baseClass += " text-foreground";
  else if (variant === "destructive")
    baseClass +=
      " border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80";
  else
    baseClass +=
      " border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80";

  return <div className={`${baseClass} ${className || ""}`}>{children}</div>;
};

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl border bg-card text-card-foreground shadow ${className || ""}`}
  >
    {children}
  </div>
);

const getStatusIcon = (status: CommandStatus | EventStatus) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "PARTIAL":
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case "FAILED":
    case "TIMEOUT":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: CommandStatus | EventStatus) => {
  switch (status) {
    case "SUCCESS":
      return (
        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
          SUCCESS
        </span>
      );
    case "PARTIAL":
      return (
        <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
          PARTIAL
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
          FAILED
        </span>
      );
    case "TIMEOUT":
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
          TIMEOUT
        </span>
      );
    default:
      return null;
  }
};

export function AuditPage() {
  const [commands, setCommands] = useState<AuditCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(
    new Set(),
  );

  // Filters
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actorFilter, setActorFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("24h");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      // previous implementation hit the analytics audit endpoint which was incorrect
      // we now query the lineage-manager service directly for audit records
      // example: /admin-console/lineage-manager/api/v1/audits?limit=100
      const response = await fetch(
        `${config.BASE_URL}/lineage-manager/api/v1/audits?limit=100`,
      );
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      const data = await response.json();
      setCommands(data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [dateFilter]); // Refetch when date range changes

  const toggleCommandExpansion = (commandId: string) => {
    setExpandedCommands((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commandId)) {
        newSet.delete(commandId);
      } else {
        newSet.add(commandId);
      }
      return newSet;
    });
  };

  const filteredData = commands.filter((cmd) => {
    if (typeFilter !== "All" && typeFilter !== "Commands") return true; // Simplify for now
    if (statusFilter !== "All" && cmd.status !== statusFilter) return false;
    if (actorFilter !== "All" && cmd.actor !== actorFilter) return false;
    if (
      searchQuery &&
      !cmd.summary.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Audit / Operations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm text-gray-500">
            System operation commands and event history log
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAuditData}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <SummaryGrid 
        cols={4}
        metrics={[
          { type: "total_commands", value: commands.length, subtext: "Total recorded" },
          { type: "success_ops", value: commands.filter(c => c.status === "SUCCESS").length, subtext: "Completed successfully" },
          { type: "failed_ops", value: commands.filter(c => c.status === "FAILED").length, subtext: "Execution errors", status: "critical" },
          { type: "sla_breach", value: 2, subtext: "Delayed commands", status: "warning" },
        ]}
      />

      {/* Filters */}
      <Card className="bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-nowrap items-end gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* Type Filter */}
            <div className="space-y-2 min-w-[140px] flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </label>
              <select
                className="w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Commands">Commands</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2 min-w-[140px] flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </label>
              <select
                className="w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="SUCCESS">Success</option>
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Actor Filter */}
            <div className="space-y-2 min-w-[160px] flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actor
              </label>
              <select
                className="w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="admin@team">admin@team</option>
                <option value="operator@team">operator@team</option>
                <option value="developer@team">developer@team</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2 min-w-[140px] flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date Range
              </label>
              <select
                className="w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            {/* Search */}
            <div className="space-y-2 min-w-[200px] flex-1 flex-shrink-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Search
              </label>
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Command History</h3>
          <p className="text-sm text-gray-500">Click to expand details</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3 w-40">Time</th>
                <th className="px-4 py-3 w-28">Type</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3 w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                filteredData.map((command) => (
                  <React.Fragment key={command.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleCommandExpansion(command.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        {expandedCommands.has(command.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">
                        {command.timestamp}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {command.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900">
                            {command.summary}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>by {command.actor}</span>
                            {command.incidentId && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>incident {command.incidentId}</span>
                              </>
                            )}
                            {command.relatedInfo && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span>{command.relatedInfo}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(command.status)}
                          {getStatusBadge(command.status)}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedCommands.has(command.id) && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-4 py-0">
                          <div className="pl-12 pr-4 py-4 space-y-3 border-l-2 border-blue-100 ml-6 my-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Event Log
                            </p>
                            <div className="space-y-2">
                              {command.events.map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-start gap-3 text-sm group"
                                >
                                  <div className="mt-0.5">
                                    {getStatusIcon(event.status)}
                                  </div>
                                  <span className="font-mono text-xs text-gray-500 w-20 pt-0.5">
                                    {event.timestamp}
                                  </span>
                                  <span className="text-gray-700 flex-1">
                                    {event.description}
                                  </span>
                                  {event.status !== "SUCCESS" && (
                                    <span className="text-xs border px-1.5 py-0.5 rounded text-gray-500">
                                      {event.status}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Save, X, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { config } from '../../shared/api/config';
import { SummaryGrid } from '../../shared/ui/SummaryGrid';

// --- Types ---
type Role = "PM" | "OPERATOR" | "DEVELOPER" | "VIEWER";

interface User {
  user_id: string; // From backend
  name: string;
  email: string;
  roles?: Role[]; // May be missing from catalog list
  department: string;
  status: string;
}

// --- UI Helpers ---
const Badge = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}) => {
  let baseClass =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  if (variant === "secondary")
    baseClass += " border-transparent bg-blue-100 text-blue-800";
  else if (variant === "destructive")
    baseClass += " border-transparent bg-red-100 text-red-800";
  else if (variant === "outline") baseClass += " border-gray-200 text-gray-700";
  else if (variant === "success") baseClass += " border-transparent bg-green-100 text-green-800";
  else baseClass += " border-transparent bg-gray-100 text-gray-800";

  return <div className={baseClass}>{children}</div>;
};

const getRoleBadgeVariant = (role: Role) => {
  switch (role) {
    case "PM":
      return "secondary";
    case "OPERATOR":
      return "default";
    case "DEVELOPER":
      return "destructive";
    default:
      return "outline";
  }
};

export function UsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialQ = queryParams.get("q") || "";

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  // Update searchQuery when URL changes
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q") || "";
    setSearchQuery(q);
    setCurrentPage(1);
    fetchUsers(1, q);
  }, [location.search]);

  const fetchUsers = async (page = currentPage, query = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const offset = (page - 1) * pageSize;
      const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
      const url = `${config.API_BASE_URL}/api/v1/users/?limit=${pageSize}&offset=${offset}${qParam}`;
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      
      if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotal(data.total || 0);
      } else if (Array.isArray(data)) {
        // Fallback for old API
        setUsers(data);
        setTotal(data.length);
      } else {
        setUsers([]);
        setTotal(0);
        console.warn("Received unexpected user data format", data);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      setUsers([]);
      if (error.name === 'AbortError') {
         setError("Failed to get users (Timeout)");
      } else {
         setError("Failed to get users");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchUsers(1, searchQuery);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setSelectedRoles(user.roles || []);
  };

  const handleToggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveRoles = () => {
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingUser.user_id ? { ...u, roles: [...selectedRoles] } : u,
        ),
      );
      setEditingUser(null);
      setSelectedRoles([]);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Users
          </h1>
          <p className="text-muted-foreground mt-1 text-sm text-gray-500">
            Manage user access and permissions
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchUsers()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <SummaryGrid 
        metrics={[
          { 
            type: "total_users", 
            value: loading ? "-" : error ? "N/A" : total, 
            subtext: "Total accounts" 
          },
          { 
            type: "active_users", 
            value: loading ? "-" : error ? "N/A" : users.filter(u => u.status === "ACTIVE").length, 
            subtext: "Active status" 
          },
          { 
            type: "new_users", 
            value: loading ? "-" : "0", 
            subtext: "Last 7 days" 
          },
          { 
            type: "inactive_users", 
            value: loading ? "-" : users.filter(u => u.status === "INACTIVE").length, 
            subtext: "Inactive accounts", 
            status: "warning" 
          },
        ]}
      />

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
            <p className="text-sm text-gray-500">
              {total} users found
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search owner or email..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); fetchUsers(1, ""); }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                      <span className="text-gray-500 font-medium">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-red-500 bg-red-50/50">
                    <div className="flex flex-col items-center gap-2">
                       <X className="h-8 w-8" />
                       <span className="font-medium">{error}</span>
                       <button onClick={() => fetchUsers()} className="mt-2 text-sm text-blue-600 underline">Try again</button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-20 text-center text-gray-400"
                  >
                    No users matching your search
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => navigate(`/users/${encodeURIComponent(user.user_id)}`)}
                      >
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <UserIcon className="w-4 h-4" />
                         </div>
                         <div>
                            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-400">{user.user_id}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{user.department || "N/A"}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === "ACTIVE" ? "success" : "default"}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Edit Roles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && !error && total > pageSize && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> of <span className="font-medium">{total}</span> users
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                disabled={currentPage * pageSize >= total}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Roles Dialog (Simplified Modal) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Edit User Roles
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Modify permissions for <strong>{editingUser.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(["PM", "OPERATOR", "DEVELOPER", "VIEWER"] as Role[]).map((role) => (
                <div
                  key={role}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleToggleRole(role)}
                >
                  <div
                    className={`w-5 h-5 rounded border ${selectedRoles.includes(role) ? "bg-blue-600 border-blue-600 flex items-center justify-center" : "border-gray-300"}`}
                  >
                    {selectedRoles.includes(role) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {role === "PM" && "View-only access to dashboards and data"}
                      {role === "OPERATOR" && "Execute jobs, manage pipelines, respond to incidents"}
                      {role === "DEVELOPER" && "Full access including schema changes and deployments"}
                      {role === "VIEWER" && "Basic read-only access"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-md"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

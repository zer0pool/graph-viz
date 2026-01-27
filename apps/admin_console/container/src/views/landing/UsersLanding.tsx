import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Save, X } from "lucide-react";
import { config } from "../../config";
import { SummaryGrid, MetricData } from "../../components/common/SummaryGrid";


// --- Types ---
type Role = "PM" | "OPERATOR" | "DEVELOPER";

interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  department: string;
  lastActive: string;
}

// --- UI Helpers ---
const Badge = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) => {
  let baseClass =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  if (variant === "secondary")
    baseClass += " border-transparent bg-blue-100 text-blue-800";
  else if (variant === "destructive")
    baseClass += " border-transparent bg-red-100 text-red-800";
  else if (variant === "outline") baseClass += " border-gray-200 text-gray-700";
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
  }
};

export const UsersLanding: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/v1/users/`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setSelectedRoles([...user.roles]);
  };

  const handleToggleRole = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveRoles = () => {
    if (editingUser) {
      // In a real app, this would update the backend
      console.log("Saving roles for", editingUser.email, ":", selectedRoles);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, roles: [...selectedRoles] } : u,
        ),
      );

      setEditingUser(null);
      setSelectedRoles([]);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <SummaryGrid 
        metrics={[
          { type: "total_users", value: users.length, subtext: "Total accounts" },
          { type: "active_users", value: users.length - 2, subtext: "Active recently" },
          { type: "privileged_users", value: users.filter(u => u.roles.includes("PM") || u.roles.includes("OPERATOR")).length, subtext: "High level access" },
          { type: "inactive_users", value: 2, subtext: "No activity > 30d", status: "warning" },
        ]}
      />

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
            <p className="text-sm text-gray-500">
              Search and manage user permissions
            </p>
          </div>
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Roles</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{user.department}</Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.lastActive}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
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
      </div>

      {/* Edit Roles Dialog (Simplified Modal) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
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
              {(["PM", "OPERATOR", "DEVELOPER"] as Role[]).map((role) => (
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
                      {role === "PM" &&
                        "View-only access to dashboards and data"}
                      {role === "OPERATOR" &&
                        "Execute jobs, manage pipelines, respond to incidents"}
                      {role === "DEVELOPER" &&
                        "Full access including schema changes and deployments"}
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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

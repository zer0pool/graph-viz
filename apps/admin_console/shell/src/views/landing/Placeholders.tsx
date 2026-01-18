import React from "react";

export const AuditLanding: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">Audit & Events</h1>
    <p className="text-gray-600">
      This page will display system audit logs and event history.
    </p>
    <div className="mt-8 p-12 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
      Audit log data visualization coming soon
    </div>
  </div>
);

export const UsersLanding: React.FC = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">User Management</h1>
    <p className="text-gray-600">
      Manage system users, roles, and permissions.
    </p>
    <div className="mt-8 p-12 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
      User management interface coming soon
    </div>
  </div>
);

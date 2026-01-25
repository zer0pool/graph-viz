import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  ArrowLeft,
} from "lucide-react";

export const UserDetail: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Simple static user data for demo
  const user = {
    id: userId,
    name: userId === "jwilson" ? "James Wilson" : "Sarah Chen",
    email: `${userId}@samsung.com`,
    department:
      userId === "jwilson" ? "Data Intelligence" : "Financial Analytics",
    role: userId === "jwilson" ? "Data Engineer" : "Financial Analyst",
    lastActive: "2026-01-25 14:20",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/users")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 h-32 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 bg-indigo-500 rounded-2xl border-4 border-white flex items-center justify-center text-white">
            <UserIcon className="w-12 h-12" />
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-slate-500 mt-1">{user.role}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl">
              <Mail className="w-5 h-5 text-slate-400" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl">
              <Building className="w-5 h-5 text-slate-400" />
              <span>{user.department}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 p-4 bg-slate-50 rounded-xl">
              <Shield className="w-5 h-5 text-slate-400" />
              <span>
                Admin Console: <strong>Developer</strong>
              </span>
            </div>
          </div>

          <section className="mt-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Owned Assets
            </h3>
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 italic">
              Asset list is integrated with the Catalog MFE...
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

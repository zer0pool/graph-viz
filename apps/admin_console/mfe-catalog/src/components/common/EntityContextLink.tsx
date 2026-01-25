import React from "react";
import { useMfeNavigate } from "../../utils/navigation";

interface EntityLinkProps {
  label: string;
  path: string;
  title?: string;
  variant?: "primary" | "subtle";
}

/**
 * Reusable link component for cross-entity navigation (Jobs, Projects, Users).
 * Synchronizes with the Shell automatically.
 */
export const EntityContextLink: React.FC<EntityLinkProps> = ({
  label,
  path,
  title,
  variant = "primary",
}) => {
  const navigate = useMfeNavigate();

  const baseStyles = "text-sm text-left transition-colors";
  const variants = {
    primary: "text-indigo-600 font-semibold hover:underline",
    subtle: "text-slate-600 hover:text-indigo-600",
  };

  return (
    <div className="flex flex-col">
      {title && (
        <span className="text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">
          {title}
        </span>
      )}
      <button
        onClick={() => navigate(path)}
        className={`${baseStyles} ${variants[variant]}`}
      >
        {label}
      </button>
    </div>
  );
};

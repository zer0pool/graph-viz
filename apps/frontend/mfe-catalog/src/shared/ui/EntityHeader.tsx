import React, { ReactNode } from "react";
import { LucideIcon, Star } from "lucide-react";
import { Badge } from "./badge";

export interface HeaderMetadataItem {
  icon: LucideIcon;
  label: ReactNode;
}

interface EntityHeaderProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  subLabels?: ReactNode[]; // Simplified sub-labels for quick metrics
  metadata?: HeaderMetadataItem[];
  actions?: ReactNode;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  icon: Icon,
  iconClassName = "bg-blue-50 text-blue-600 border-blue-100",
  title,
  badge,
  badgeVariant = "secondary",
  metadata = [],
  actions,
  isFavorite = false,
  onFavoriteToggle,
}) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl border shadow-sm ${iconClassName}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {onFavoriteToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle();
                }}
                className={`transition-colors p-1 -ml-1 rounded-md hover:bg-slate-100 group ${isFavorite ? "text-amber-400" : "text-slate-300"}`}
              >
                <Star
                  className={`w-5 h-5 ${isFavorite ? "fill-current" : "fill-none"} group-hover:scale-110 transition-transform`}
                />
              </button>
            )}
            <h1 className="text-xl font-bold text-slate-900 tracking-tight ml-1">{title}</h1>
            {badge && (
              <Badge
                variant={badgeVariant}
                className="uppercase text-[10px] tracking-widest font-extrabold px-2 py-0"
              >
                {badge}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium ml-1">
            {metadata.map((item, index) => {
              const MetaIcon = item.icon;
              return (
                <span key={index} className="flex items-center gap-1">
                  <MetaIcon className="w-3.5 h-3.5 opacity-70" /> {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-4 ml-8 border-l border-slate-100 pl-8">{actions}</div>
      )}
    </div>
  );
};

import React from "react";
import { RefreshCcw, GitBranch } from "lucide-react";
interface HeaderActionButtonsProps {
  onSync?: () => void;
  onLineage?: () => void;
  lineageLabel?: string;
}

export const HeaderActionButtons: React.FC<HeaderActionButtonsProps> = ({
  onSync,
  onLineage,
  lineageLabel = "See lineage graph",
}) => {
  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={onSync}
        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        title="Sync Data"
      >
        <RefreshCcw className="w-4 h-4" />
      </button>
      {onLineage && (
        <button 
          onClick={onLineage}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded shadow-sm transition-all shadow-[#3c404326] ml-2"
        >
          <GitBranch className="w-3.5 h-3.5" />
          {lineageLabel}
        </button>
      )}
    </div>
  );
};

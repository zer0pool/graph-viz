import { TableDetail } from "../../shared/types/table";
import { formatBytes, formatNumber, formatDate } from "../../shared/lib/utils";

interface TableOverviewProps {
  table: TableDetail;
  loading?: boolean;
  writerCount?: number;
  readerCount?: number;
}

export const TableOverview: React.FC<TableOverviewProps> = ({
  table,
  loading,
  writerCount = 0,
  readerCount = 0,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Metrics Row - Cleaner GCP Style */}
      <div className="flex gap-12 py-6 border-b border-[#f1f3f4] mb-8">
        <div>
          <div className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Writers
          </div>
          <div className="text-2xl font-medium text-[#202124]">{writerCount}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Readers
          </div>
          <div className="text-2xl font-medium text-[#202124]">{readerCount}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Rows
          </div>
          <div className="text-2xl font-medium text-[#202124]">
            {formatNumber(table.storage_info?.row_count)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Size
          </div>
          <div className="text-2xl font-medium text-[#202124]">
            {formatBytes(table.storage_info?.size_bytes)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-16 gap-y-12">
        {/* Left Column: Table Details */}
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-medium text-[#202124] mb-4">Table details</h2>
            <div className="divide-y divide-[#f1f3f4] border-t border-[#f1f3f4]">
              <PropertyRow label="Unique Id" value={table.name} isLink />
              <PropertyRow label="System" value={table.storage_info?.type || "bigquery"} />
              <PropertyRow label="Type" value="table" />
              <PropertyRow label="Location" value={table.storage_info?.location} />
              <PropertyRow label="Format" value={table.storage_info?.format} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#5f6368] uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-sm text-[#3c4043] leading-relaxed">
              {table.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Right Column: Metadata & Tags */}
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-medium text-[#202124] mb-4">Metadata</h3>
            <div className="divide-y divide-[#f1f3f4] border-t border-[#f1f3f4]">
              <PropertyRow label="Created" value={formatDate(table.created_at)} />
              <PropertyRow label="Modified" value={formatDate(table.updated_at)} />
            </div>
          </div>

          <div>
            <h3 className="text-base font-medium text-[#202124] mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2 pt-2">
              {table.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-[#f3f4f6] text-[#4b5563] text-[10px] font-medium rounded-full border border-[#e5e7eb]"
                >
                  {tag}
                </span>
              )) || <span className="text-xs text-gray-400 italic">None</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{ label: string; value?: string; isLink?: boolean }> = ({
  label,
  value,
  isLink,
}) => (
  <div className="grid grid-cols-3 py-3 items-start">
    <span className="text-sm text-[#5f6368] col-span-1">{label}</span>
    <span
      className={`text-sm font-normal col-span-2 ${isLink ? "text-[#1a73e8] hover:underline cursor-pointer" : "text-[#202124]"}`}
    >
      {value || "—"}
    </span>
  </div>
);

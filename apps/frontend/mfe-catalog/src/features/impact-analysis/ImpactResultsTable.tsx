import { Database, Zap, SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../shared/ui/table";
import { ImpactRow } from "./types";

interface ImpactResultsTableProps {
  rows: ImpactRow[];
  loading: boolean;
  onRowClick: (row: ImpactRow) => void;
}

function SkeletonRow() {
  return (
    <TableRow>
      {[40, 220, 90, 180, 120, 80].map((w, i) => (
        <TableCell key={i} className="py-3">
          <div
            className="h-4 bg-slate-100 rounded animate-pulse"
            style={{ width: `${w * 0.6}px` }}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

function TableTypeBadge({ type }: { type: ImpactRow["type"] }) {
  if (type === "Table") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 border border-blue-100 text-blue-700">
        <Database className="h-3 w-3" />
        Table
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 border border-green-100 text-green-700">
      <Zap className="h-3 w-3" />
      Job
    </span>
  );
}

function PathCell({ row }: { row: ImpactRow }) {
  if (row.type === "Table") {
    return (
      <span className="text-xs text-slate-400">
        {row.path.map((segment, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-1 text-slate-300">›</span>}
            {segment}
          </span>
        ))}
      </span>
    );
  }
  if (row.targetTable) {
    const parts = row.targetTable.split(".");
    const display = parts.slice(-2).join(".");
    return (
      <span className="text-xs text-slate-400 italic">→ {display}</span>
    );
  }
  return null;
}

export function ImpactResultsTable({ rows, loading, onRowClick }: ImpactResultsTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-10 text-center text-[11px] uppercase tracking-wider font-semibold text-slate-500" />
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Name
            </TableHead>
            <TableHead className="w-[90px] text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Type
            </TableHead>
            <TableHead className="w-[200px] text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Path
            </TableHead>
            <TableHead className="w-[120px] text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Steward(s)
            </TableHead>
            <TableHead className="w-20 text-center text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Distance
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <SearchX className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">No downstream objects found</p>
                  <p className="text-xs text-slate-400">
                    Try increasing Max Distance or adjusting filters
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onRowClick(row)}
              >
                <TableCell className="w-10" />
                <TableCell>
                  <div className="flex items-center gap-2">
                    {row.type === "Table" ? (
                      <Database className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    )}
                    <span
                      className="text-sm font-medium text-blue-600 hover:underline truncate"
                      title={row.name}
                    >
                      {row.name.split(".").pop() ?? row.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TableTypeBadge type={row.type} />
                </TableCell>
                <TableCell>
                  <PathCell row={row} />
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-400 italic">{row.steward}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {row.distance}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

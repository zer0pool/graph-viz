import { ImpactRow } from "./types";

export function exportToCsv(rows: ImpactRow[], baseTable: string): void {
  const headers = ["Name", "Type", "Path", "Steward", "Distance"];
  const csvRows = rows.map((r) => [
    `"${r.name.replace(/"/g, '""')}"`,
    r.type,
    `"${r.path.join(" / ")}"`,
    r.steward,
    String(r.distance),
  ]);
  const lines = [headers.join(","), ...csvRows.map((r) => r.join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `impact_${baseTable.replace(/[^a-z0-9_]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

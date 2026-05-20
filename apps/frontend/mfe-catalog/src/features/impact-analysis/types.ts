export type ImpactRowType = "Table" | "Job";

export interface ImpactRow {
  id: string; // "table:fqn" or "job:name@depth"
  type: ImpactRowType;
  name: string; // fully qualified table name OR job name
  path: string[]; // ["project", "schema"] for Table; [] for Job
  steward: string; // "None" for now
  distance: number;
  writerJobs?: string[]; // Table rows only — used for Source filter
  targetTable?: string; // Job rows only
}

export interface ImpactFilters {
  objectType: "All" | "Table" | "Job";
  source: string; // writer job name; "" = All
  maxDistance: number; // 1–10 → max_depth param
}

export const DEFAULT_FILTERS: ImpactFilters = {
  objectType: "All",
  source: "",
  maxDistance: 3,
};

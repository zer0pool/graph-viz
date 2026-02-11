export * from "./analytics";

export interface PaginatedResponse<T> {
  total: number;
  [key: string]: any; // Allow for 'jobs', 'tables', etc.
}

export type ViewMode = "EMBEDDED" | "PAGE" | "STANDALONE";

export type Selection = {
  type: "job" | "table";
  id?: string;
  jobId?: string;
  tableName?: string;
  action?: "click" | "showDetail";
};

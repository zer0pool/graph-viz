export type ViewMode = "EMBEDDED" | "PAGE";

export type Selection = {
  type: "job" | "table";
  id?: string;
  jobId?: string;
  tableName?: string;
  action?: "click" | "showDetail";
};

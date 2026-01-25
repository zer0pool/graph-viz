export type ViewMode = "EMBEDDED" | "PAGE" | "STANDALONE";

export type Selection = {
  type: "job" | "table";
  id?: string;
  jobId?: string;
  tableName?: string;
  action?: "click" | "showDetail";
};

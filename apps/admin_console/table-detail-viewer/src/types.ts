export type ViewMode = "EMBEDDED" | "PAGE";

export type Selection =
  | { type: "job"; jobId: string }
  | { type: "table"; tableName: string };

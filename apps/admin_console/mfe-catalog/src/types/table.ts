export interface TableDetail {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  tags?: string[];
  labels?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  storage_info?: {
    type?: string;
    location: string;
    format: string;
    size_bytes?: number;
    row_count?: number;
    partitioning?: string;
    clustering?: string[];
  };
}

export interface TableLineageRelation {
  id: string;
  name: string;
  type: "job" | "table";
  status?: string;
  relation_type?: string;
}

export interface TableLineageMetrics {
  root_count: number;
  leaf_count: number;
  upstream_table_count: number;
  downstream_table_count: number;
  upstream_job_count: number;
  downstream_job_count: number;
  depth: {
    upstream: number;
    downstream: number;
  };
}

export interface TableLineageSummary {
  metrics: TableLineageMetrics;
  upstream: {
    root_tables: string[];
    tables: string[];
    jobs: string[];
  };
  downstream: {
    leaf_tables: string[];
    tables: string[];
    jobs: string[];
  };
  paths: {
    preview: string[][];
    full: string[][];
  };
}

export interface TableLineageResponse {
  status: string;
  result: TableLineageSummary;
}

export interface TableSchemaColumn {
  name: string;
  type: string;
  mode: string;
  description?: string;
  fields?: TableSchemaColumn[]; // For nested types like STRUCT/RECORD
}

export interface TableSchemaResponse {
  columns: TableSchemaColumn[];
}

export interface TableTimelinessData {
  date: string;
  period: string;
  status: string;
  success_count: number;
  fail_count: number;
  rate: number;
}

export interface HourlyTimelinessData {
  hour: string;
  state: string;
  interval_start: string;
  interval_end: string;
}

export interface TableTimelinessResponse {
  daily_summary: TableTimelinessData[];
  hourly_detail: Record<string, HourlyTimelinessData[]>;
  time_range: {
    start: string;
    end: string;
  };
}

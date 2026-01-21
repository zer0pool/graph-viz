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
  relation_type?: "source" | "sink" | "trigger";
}

export interface TableLineageSummary {
  upstreams: TableLineageRelation[];
  downstreams: TableLineageRelation[];
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
  timestamp: string;
  row_count: number;
  data_freshness_lag?: number;
}

export interface TableTimelinessResponse {
  history: TableTimelinessData[];
}

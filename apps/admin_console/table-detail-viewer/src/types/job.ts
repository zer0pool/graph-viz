export interface JobNodeRelation {
  id?: string;
  name: string;
  full_name?: string;
  type: string;
  dependency_type?: "HARD" | "SOFT";
}

export interface JobDetail {
  id: string;
  name: string;
  status: string;
  schedule?: string;
  owner?: string;
  description?: string;
  last_run_time?: string;
  next_run_time?: string;
  type?: string;
  lifecycle_status?: string;
  labels?: Record<string, string>;
  run_summary?: {
    success: number;
    failed: number;
    running: number;
    total: number;
  };
  upstreams?: JobNodeRelation[];
  downstreams?: JobNodeRelation[];
}

export interface JobRun {
  run_id: string;
  job_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  triggered_by?: string;
}

export interface JobRunHistoryResponse {
  runs: JobRun[];
  total: number;
  page: number;
  page_size: number;
}

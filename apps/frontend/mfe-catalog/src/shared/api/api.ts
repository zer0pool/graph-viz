import { AuthClient } from "../types/auth";
import { JobDetail, JobRunHistoryResponse, Job } from "../types/job";
import { TableDetail, TableSchemaResponse, TableTimelinessResponse } from "../types/table";
import { JobHealthResponse, JobLineageHybridResponse } from "./types/lineage";
import { SummaryMetricsResponse, PaginatedResponse } from "../types";

export class ApiClient {
  private auth: AuthClient;
  private baseUrl: string;

  constructor(auth: AuthClient, baseUrl: string = "") {
    this.auth = auth;
    // Default to /admin-console if no specific base URL provided
    // Requests will then use /api/v1/... to match Shell proxy /admin-console/api rules
    this.baseUrl = baseUrl || "/admin-console";
  }

  public async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const res = await this.auth.fetchWithAuth(fullUrl, options);

    if (!res.ok) {
      throw new Error(`API Request failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.result !== undefined ? data.result : data;
  }

  public async graphqlRequest<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const url = "/analytics-manager/graphql";
    const res = await this.auth.fetchWithAuth(`${this.baseUrl}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL Request failed: ${res.status}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length > 0) {
      throw new Error(errors[0].message);
    }
    return data;
  }

  // --- Job Endpoints ---

  async fetchJobDetail(jobId: string): Promise<JobDetail> {
    return this.request<JobDetail>(`/lineage-manager/api/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  async fetchJobs(limit: number = 20, offset: number = 0): Promise<PaginatedResponse<Job>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request<PaginatedResponse<Job>>(`/lineage-manager/api/v1/jobs?${params.toString()}`);
  }

  async fetchJobRunHistory(jobId: string): Promise<JobRunHistoryResponse> {
    return this.request<JobRunHistoryResponse>(
      `/lineage-manager/api/v1/jobs/${encodeURIComponent(jobId)}/run-history`
    );
  }

  async fetchJobHealth(jobId: string): Promise<JobHealthResponse> {
    return this.request<JobHealthResponse>(`/lineage-manager/api/v1/jobs/${encodeURIComponent(jobId)}/health`);
  }

  async fetchJobLineageHybrid(jobId: string): Promise<JobLineageHybridResponse> {
    return this.request<JobLineageHybridResponse>(
      `/lineage-manager/api/v1/jobs/${encodeURIComponent(jobId)}/lineage`
    );
  }

  async fetchProjectJobs(
    projectId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResponse<Job>> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return this.request<PaginatedResponse<Job>>(
      `/lineage-manager/api/v1/projects/${encodeURIComponent(projectId)}/jobs?${params.toString()}`
    );
  }

  async fetchProjectDetail(projectId: string): Promise<any> {
    return this.request<any>(`/lineage-manager/api/v1/projects/${encodeURIComponent(projectId)}`);
  }

  async fetchProjectUsers(projectId: string): Promise<any> {
    return this.request<any>(`/lineage-manager/api/v1/projects/${encodeURIComponent(projectId)}/users`);
  }

  // --- Table Endpoints ---

  async fetchTableDetail(tableName: string): Promise<TableDetail> {
    const raw = await this.request<any>(`/lineage-manager/api/v1/tables/${encodeURIComponent(tableName)}/detail`);

    // Map Backend Response to Frontend Interface
    return {
      id: raw.full_name || tableName,
      name: raw.full_name || tableName,
      description: raw.description,
      owner: raw.labels?.owner, // Assuming owner might come from labels, or add logic if separate
      created_at: raw.created,
      updated_at: raw.modified || raw.updated,
      labels: raw.labels,
      storage_info: {
        type: raw.table_type,
        location: raw.location,
        format: "BigQuery", // or derived from type
        size_bytes: raw.storage?.num_bytes,
        row_count: raw.storage?.num_rows,
        partitioning: raw.storage?.partitioning,
        clustering: raw.storage?.clustering,
      },
    };
  }

  async fetchTableSchema(tableName: string): Promise<TableSchemaResponse> {
    return this.request<TableSchemaResponse>(
      `/lineage-manager/api/v1/tables/${encodeURIComponent(tableName)}/schema`
    );
  }

  async fetchTableTimeliness(tableName: string, days: number = 7): Promise<any> {
    const params = new URLSearchParams({ days: String(days) });
    return this.request<any>(
      `/lineage-manager/api/v1/tables/${encodeURIComponent(tableName)}/timelines?${params.toString()}`
    );
  }

  async fetchTableLineageSummary(
    tableName: string,
    options: { maxRoots?: number; maxLeaves?: number } = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options.maxRoots) params.set("max_roots", String(options.maxRoots));
    if (options.maxLeaves) params.set("max_leaves", String(options.maxLeaves));

    const queryString = params.toString();
    const url = `/lineage-manager/api/v1/tables/${encodeURIComponent(
      tableName
    )}/lineage-summary${queryString ? `?${queryString}` : ""}`;
    return this.request(url);
  }

  async fetchTables(limit: number = 20, offset: number = 0): Promise<any> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    // Returning any here because table response structure is more complex currently
    return this.request<any>(`/lineage-manager/api/v1/tables?${params.toString()}`);
  }

  async fetchOverviewSummary(): Promise<SummaryMetricsResponse> {
    return this.request<SummaryMetricsResponse>(
      "/analytics-manager/api/v1/metrics/summary/overview"
    );
  }

  async fetchJobsSummary(): Promise<SummaryMetricsResponse> {
    return this.request<SummaryMetricsResponse>("/analytics-manager/api/v1/metrics/summary/jobs");
  }

  async fetchTablesSummary(): Promise<SummaryMetricsResponse> {
    return this.request<SummaryMetricsResponse>("/analytics-manager/api/v1/metrics/summary/tables");
  }

  async fetchUsersSummary(): Promise<SummaryMetricsResponse> {
    return this.request<SummaryMetricsResponse>("/analytics-manager/api/v1/metrics/summary/users");
  }

  async fetchSummaryMetrics(): Promise<SummaryMetricsResponse> {
    return this.request<SummaryMetricsResponse>(
      "/analytics-manager/api/v1/analytics/dashboard-metrics"
    );
  }

  // --- Graph/Generic Endpoints ---

  // TODO: Add other methods as needed: fetchNeighbors, expand, etc.
}

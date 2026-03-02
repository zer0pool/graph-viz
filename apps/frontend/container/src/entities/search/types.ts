// Search entity types

export interface SearchSuggestion {
  type: "job" | "table" | "owner";
  id: string;
  name: string;
}

export interface SearchResponse {
  jobs?: Array<{ job_id: string; name?: string }>;
  tables?: Array<{ table_name: string; name?: string }>;
  owners?: Array<string | { name: string }>;
}

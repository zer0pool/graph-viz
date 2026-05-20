/**
 * Search Widget Types
 *
 * Defines all types for the global search functionality
 * including Jobs, Tables, and Users with their properties
 */

// Base interface for all searchable items
interface BaseSearchItem {
  id: string;
  name: string;
  type: SearchType;
  relevanceScore?: number;  // Search result relevance score (0-100)
}

// Job type - represents a data pipeline/ETL job
export interface Job extends BaseSearchItem {
  type: 'job';
  description: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  owner: string;
  lastExecuted?: string;
  duration?: string;
}

// Table type - represents a database table
export interface Table extends BaseSearchItem {
  type: 'table';
  description: string;
  rowCount?: number;
  columnCount?: number;
  database?: string;
  lastUpdated?: string;
  owner?: string;
}

// User type - represents a platform user
export interface DataUser extends BaseSearchItem {
  type: 'user';
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  department?: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

export type SearchType = 'job' | 'table' | 'user';
export type SearchItem = Job | Table | DataUser;

// Search filters and results
export interface SearchFilters {
  rawInput: string;  // User's raw input (for display in input field)
  query: string;     // Parsed search query (for API request)
  type: SearchType | 'all';
}

export interface SearchResult {
  items: SearchItem[];
  total: number;
  counts: Record<SearchType | 'all', number>;
}

// API Response type
export interface ApiSearchResponse {
  jobs?: any[];
  tables?: any[];
  owners?: any[];
  users?: any[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: string;
  createdAt: string;
  jobIds: string[];
  tableIds: string[];
}

export interface Job {
  id: string;
  name: string;
  status: "SUCCESS" | "RUNNING" | "FAILED";
  project: string;
  projectId: string;
  owner: string;
  ownerId: string;
  lastRun: string;
  duration: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  activityCount: number;
}

export const mockProjects: Project[] = [
  {
    id: "proj-analytics",
    name: "User Analytics Flow",
    description:
      "Core analytics pipeline for user event processing and insights.",
    owner: "James Wilson",
    createdAt: "2025-10-01",
    jobIds: [
      "job-ingest-events",
      "job-aggregate-daily",
      "job-user-segmentation",
    ],
    tableIds: [
      "user_events.raw",
      "user_events.daily_agg",
      "analytics.segments",
    ],
  },
  {
    id: "proj-finance",
    name: "Financial Reporting",
    description:
      "End-of-month financial consolidation and reporting automation.",
    owner: "Sarah Chen",
    createdAt: "2025-11-15",
    jobIds: ["job-finance-reconcile", "job-tax-calc"],
    tableIds: ["finance.ledger", "finance.tax_reports"],
  },
];

export const mockJobs: Job[] = [
  {
    id: "job-ingest-events",
    name: "Ingest Raw Events",
    status: "SUCCESS",
    project: "User Analytics Flow",
    projectId: "proj-analytics",
    owner: "James Wilson",
    ownerId: "jwilson",
    lastRun: "2026-01-25 21:00",
    duration: "15m 20s",
    description: "Ingests raw event data from Kafka into the data lake.",
  },
  {
    id: "job-aggregate-daily",
    name: "Aggregate Daily Stats",
    status: "RUNNING",
    project: "User Analytics Flow",
    projectId: "proj-analytics",
    owner: "James Wilson",
    ownerId: "jwilson",
    lastRun: "2026-01-25 00:05",
    duration: "45m 10s",
    description: "Aggregates hourly events into daily summaries for reporting.",
  },
  {
    id: "job-user-segmentation",
    name: "Compute User Segments",
    status: "FAILED",
    project: "User Analytics Flow",
    projectId: "proj-analytics",
    owner: "James Wilson",
    ownerId: "jwilson",
    lastRun: "2026-01-24 23:30",
    duration: "1h 05m",
    description: "Classifies users into behavior-based segments for marketing.",
  },
  {
    id: "job-finance-reconcile",
    name: "Finance Reconciliation",
    status: "SUCCESS",
    project: "Financial Reporting",
    projectId: "proj-finance",
    owner: "Sarah Chen",
    ownerId: "schen",
    lastRun: "2026-01-25 08:00",
    duration: "25m 45s",
    description: "Matches internal ledgers with external bank statements.",
  },
];

export const mockUsers: User[] = [
  {
    id: "jwilson",
    name: "James Wilson",
    email: "james.wilson@samsung.com",
    role: "Data Engineer",
    activityCount: 154,
  },
  {
    id: "schen",
    name: "Sarah Chen",
    email: "sarah.chen@samsung.com",
    role: "Financial Analyst",
    activityCount: 89,
  },
];

export const datasetsData = [
  {
    id: "ds-1",
    name: "user_events.raw",
    full_name: "bq-prod:analytics.user_events",
    type: "table",
    status: "active",
    owner: "James Wilson",
    lastModified: "2026-01-25 10:00",
    size: "1.2 TB",
    sizeBytes: 1200000000000,
    growth: "+5%",
    delayed: 0,
    expiring: 0,
    schemaChanges: 2,
    dataset_name: "analytics",
    project_name: "bq-prod",
    tables: 15,
    service: "BigQuery"
  },
  {
    id: "ds-2",
    name: "user_events.daily_agg",
    full_name: "bq-prod:analytics.daily_agg",
    type: "table",
    status: "active",
    owner: "James Wilson",
    lastModified: "2026-01-25 11:30",
    size: "450 GB",
    sizeBytes: 450000000000,
    growth: "+2%",
    delayed: 1,
    expiring: 0,
    schemaChanges: 0,
    dataset_name: "analytics",
    project_name: "bq-prod",
    tables: 24,
    service: "BigQuery"
  },
  {
    id: "ds-3",
    name: "finance.ledger",
    full_name: "bq-prod:finance.ledger",
    type: "table",
    status: "active",
    owner: "Sarah Chen",
    lastModified: "2026-01-24 18:00",
    size: "2.8 TB",
    sizeBytes: 2800000000000,
    growth: "+12%",
    delayed: 0,
    expiring: 5,
    schemaChanges: 1,
    dataset_name: "finance",
    project_name: "bq-prod",
    tables: 120,
    service: "PostgreSQL"
  },
  {
    id: "ds-4",
    name: "marketing.campaigns",
    full_name: "bq-prod:marketing.campaigns",
    type: "table",
    status: "active",
    owner: "Michael Scott",
    lastModified: "2026-01-25 08:00",
    size: "120 GB",
    sizeBytes: 12000000000,
    growth: "+15%",
    delayed: 3,
    expiring: 0,
    schemaChanges: 5,
    dataset_name: "marketing",
    project_name: "bq-prod",
    tables: 8,
    service: "S3"
  },
  {
    id: "ds-5",
    name: "inventory.stock_levels",
    full_name: "bq-prod:oms.stock_levels",
    type: "table",
    status: "stable",
    owner: "Dwight Schrute",
    lastModified: "2026-01-25 09:15",
    size: "85 GB",
    sizeBytes: 85000000000,
    growth: "+1%",
    delayed: 0,
    expiring: 12,
    schemaChanges: 0,
    dataset_name: "oms",
    project_name: "bq-prod",
    tables: 32,
    service: "BigQuery"
  },
  {
    id: "ds-6",
    name: "sales.orders_v2",
    full_name: "bq-prod:sales.orders_v2",
    type: "table",
    status: "active",
    owner: "Jim Halpert",
    lastModified: "2026-01-25 10:45",
    size: "5.4 TB",
    sizeBytes: 5400000000000,
    growth: "+8%",
    delayed: 12,
    expiring: 0,
    schemaChanges: 1,
    dataset_name: "sales",
    project_name: "bq-prod",
    tables: 540,
    service: "MySQL"
  },
  {
    id: "ds-7",
    name: "hr.employees_pii",
    full_name: "bq-prod:hr.employees_pii",
    type: "view",
    status: "restricted",
    owner: "Pam Beesly",
    lastModified: "2026-01-23 14:20",
    size: "512 KB",
    sizeBytes: 512000,
    growth: "0%",
    delayed: 0,
    expiring: 0,
    schemaChanges: 0,
    dataset_name: "hr",
    project_name: "bq-prod",
    tables: 1,
    service: "Oracle"
  },
  {
    id: "ds-8",
    name: "logs.ingestion_errors",
    full_name: "bq-prod:sys.ingestion_errors",
    type: "table",
    status: "warning",
    owner: "Kevin Malone",
    lastModified: "2026-01-25 12:10",
    size: "15 GB",
    sizeBytes: 15000000000,
    growth: "+200%",
    delayed: 45,
    expiring: 0,
    schemaChanges: 12,
    dataset_name: "sys",
    project_name: "bq-prod",
    tables: 64,
    service: "Kafka"
  }
];

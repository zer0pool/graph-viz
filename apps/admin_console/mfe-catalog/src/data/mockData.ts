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

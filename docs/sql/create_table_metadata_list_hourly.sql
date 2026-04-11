-- 2026-04-11
-- Create hourly snapshots of table metadata (2026-04-01 ~ 2026-05-30)
-- Data source: lineage-manager table metadata system
--
-- NOTE: Replace 'test_project' with your actual GCP project name before executing.
--       Project name is defined in .env via BIGQUERY_TABLE_LIST_TABLE
--
-- Columns: project_name, dataset_name, table_name, issuer, period, date, hour,
--          publish_time, execute_dt, write_mode, total_row_cnt, total_logical_size

CREATE OR REPLACE TABLE `test_project.test_data.table_metadata_list` AS

WITH

-- ─────────────────────────────────────────────────────────────
-- Table definitions (31 tables)
-- Columns: project_name, dataset_name, table_name,
--          issuer (Self Scheduling / Data Scheduling),
--          period (hourly, daily, once, monthly),
--          write_mode (append, fulldump, upsert),
--          run_hour (UTC hour the job runs each day),
--          base_size_bytes, daily_growth_bytes,
--          base_rows_written, rows_written_variance
-- ─────────────────────────────────────────────────────────────

table_defs AS (
  SELECT * FROM UNNEST([

    -- ── Hourly jobs (run at 23:xx UTC) ───────────────────────

    STRUCT(
      'analytics' AS project_name, 'api' AS dataset_name, 'request_logs' AS table_name,
      'Self Scheduling' AS issuer, 'hourly' AS period,
      'append' AS write_mode, 23 AS run_hour,
      800000000000 AS base_size_bytes, 3500000000 AS daily_growth_bytes,
      12000000 AS base_rows_written, 4000000 AS rows_written_variance
    ),
    STRUCT(
      'analytics', 'search', 'indexed_queries',
      'Self Scheduling', 'hourly',
      'append', 23,
      350000000000, 1800000000,
      7500000, 2500000
    ),
    STRUCT(
      'analytics', 'api', 'rate_limit_violations',
      'Data Scheduling', 'hourly',
      'append', 23,
      45000000000, 200000000,
      800000, 300000
    ),
    STRUCT(
      'notifications', 'alerts', 'triggered',
      'Self Scheduling', 'hourly',
      'append', 23,
      28000000000, 150000000,
      600000, 200000
    ),
    STRUCT(
      'analytics', 'sales', 'daily_revenue',
      'Self Scheduling', 'daily',
      'fulldump', 23,
      120000000000, 0,
      5000000, 1500000
    ),
    STRUCT(
      'ml', 'fraud', 'risk_scores',
      'Data Scheduling', 'daily',
      'fulldump', 23,
      95000000000, 0,
      4200000, 800000
    ),

    -- ── Continuous jobs (run every hour) ──────────────────────

    STRUCT(
      'analytics', 'webhooks', 'processed_events',
      'Self Scheduling', 'hourly',
      'append', 23,
      1200000000000, 6000000000,
      50000000, 15000000
    ),
    STRUCT(
      'analytics', 'payments', 'processed_txns',
      'Self Scheduling', 'hourly',
      'append', 23,
      480000000000, 2200000000,
      18000000, 5000000
    ),
    STRUCT(
      'analytics', 'security', 'auth_logs',
      'Data Scheduling', 'hourly',
      'append', 23,
      310000000000, 1400000000,
      22000000, 6000000
    ),

    -- ── Daily jobs (run_hour varies) ──────────────────────────

    STRUCT(
      'reporting', 'cdn', 'performance_metrics',
      'Self Scheduling', 'daily',
      'fulldump', 2,
      75000000000, 0,
      3000000, 500000
    ),
    STRUCT(
      'reporting', 'cache', 'efficiency_metrics',
      'Self Scheduling', 'daily',
      'fulldump', 2,
      18000000000, 0,
      700000, 150000
    ),
    STRUCT(
      'analytics', 'api', 'version_metrics',
      'Data Scheduling', 'daily',
      'append', 3,
      22000000000, 80000000,
      400000, 100000
    ),
    STRUCT(
      'analytics', 'finance', 'billing_history',
      'Self Scheduling', 'daily',
      'append', 1,
      560000000000, 900000000,
      2500000, 400000
    ),
    STRUCT(
      'analytics', 'support', 'ticket_metrics',
      'Data Scheduling', 'daily',
      'append', 4,
      38000000000, 120000000,
      500000, 150000
    ),
    STRUCT(
      'analytics', 'realtime', 'clickstream',
      'Self Scheduling', 'hourly',
      'append', 1,
      1500000000000, 7000000000,
      60000000, 20000000
    ),
    STRUCT(
      'ml', 'reco', 'user_preferences',
      'Data Scheduling', 'daily',
      'fulldump', 3,
      280000000000, 0,
      8000000, 2000000
    ),
    STRUCT(
      'analytics', 'infra', 'health_checks',
      'Self Scheduling', 'daily',
      'append', 0,
      12000000000, 50000000,
      250000, 80000
    ),
    STRUCT(
      'analytics', 'security', 'admin_audit',
      'Data Scheduling', 'daily',
      'append', 0,
      42000000000, 180000000,
      900000, 200000
    ),
    STRUCT(
      'analytics', 'crypto', 'daily_summary',
      'Self Scheduling', 'daily',
      'fulldump', 1,
      55000000000, 0,
      2200000, 600000
    ),
    STRUCT(
      'ml', 'features', 'combined_metrics',
      'Data Scheduling', 'daily',
      'fulldump', 2,
      320000000000, 0,
      9000000, 2500000
    ),
    STRUCT(
      'analytics', 'users', 'event_summary',
      'Self Scheduling', 'hourly',
      'append', 1,
      920000000000, 4500000000,
      35000000, 10000000
    ),
    STRUCT(
      'reporting', 'dashboards', 'executive_summary',
      'Self Scheduling', 'daily',
      'fulldump', 6,
      8000000000, 0,
      150000, 30000
    ),
    STRUCT(
      'analytics', 'customers', 'profile',
      'Data Scheduling', 'daily',
      'append', 2,
      450000000000, 1200000000,
      15000000, 3000000
    ),
    STRUCT(
      'analytics', 'inventory', 'daily_snapshot',
      'Self Scheduling', 'daily',
      'fulldump', 3,
      140000000000, 0,
      5500000, 1000000
    ),
    STRUCT(
      'compliance', 'reports', 'audit_trail',
      'Data Scheduling', 'daily',
      'append', 0,
      65000000000, 300000000,
      1200000, 250000
    ),
    STRUCT(
      'analytics', 'finance', 'revenue_forecast',
      'Self Scheduling', 'daily',
      'fulldump', 4,
      32000000000, 0,
      1000000, 200000
    ),
    STRUCT(
      'analytics', 'hr', 'attrition_metrics',
      'Data Scheduling', 'daily',
      'fulldump', 5,
      9000000000, 0,
      180000, 40000
    ),
    STRUCT(
      'reporting', 'supply_chain', 'optimization',
      'Self Scheduling', 'daily',
      'fulldump', 5,
      48000000000, 0,
      1800000, 400000
    ),
    STRUCT(
      'analytics', 'it', 'incident_summary',
      'Data Scheduling', 'daily',
      'append', 6,
      15000000000, 60000000,
      300000, 90000
    ),
    STRUCT(
      'compliance', 'legal', 'review_queue',
      'Self Scheduling', 'daily',
      'append', 6,
      7000000000, 25000000,
      120000, 40000
    ),

    -- ── Weekly job ────────────────────────────────────────────

    STRUCT(
      'marketing', 'campaigns', 'target_segments',
      'Data Scheduling', 'once',
      'fulldump', 7,
      22000000000, 0,
      850000, 200000
    )

  ])
),

-- ─────────────────────────────────────────────────────────────
-- Daily date series: 2026-04-01 ~ 2026-05-30 (60 days)
-- ─────────────────────────────────────────────────────────────

daily_dates AS (
  SELECT d
  FROM UNNEST(
    GENERATE_DATE_ARRAY(DATE '2026-04-01', DATE '2026-05-30', INTERVAL 1 DAY)
  ) AS d
),

-- ─────────────────────────────────────────────────────────────
-- Data generation by period type
-- hourly: 24 records per day (every hour)
-- daily: 1 record per day (at run_hour only)
-- once: 1 record total
-- ─────────────────────────────────────────────────────────────

-- Hourly tables: 24 records per day
hourly_tables AS (
  SELECT
    t.project_name,
    t.dataset_name,
    t.table_name,
    t.issuer,
    t.period,

    -- Date in YYYYMMDD format
    FORMAT_DATE('%Y%m%d', d.d) AS date,

    -- Hour in HH format (00-23)
    LPAD(CAST(h AS STRING), 2, '0') AS hour,

    -- publish_time: timestamp at this hour
    TIMESTAMP_ADD(
      TIMESTAMP(d.d, 'UTC'),
      INTERVAL h HOUR
    ) + INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_pub_', FORMAT_DATE('%Y%m%d', d.d), '_', LPAD(CAST(h AS STRING), 2, '0'))), 3600)) AS INT64) SECOND
    AS publish_time,

    -- execute_dt: slightly before publish_time
    TIMESTAMP_ADD(
      TIMESTAMP(d.d, 'UTC'),
      INTERVAL h HOUR
    ) - INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_exec_', FORMAT_DATE('%Y%m%d', d.d), '_', LPAD(CAST(h AS STRING), 2, '0'))), 600)) AS INT64) SECOND
    AS execute_dt,

    t.write_mode,

    -- total_row_cnt: hourly delta rows (average of daily / 24)
    CAST(
      (t.base_rows_written / 24)
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_rows_', FORMAT_DATE('%Y%m%d', d.d), '_', LPAD(CAST(h AS STRING), 2, '0'))), 100))
        * CAST(t.rows_written_variance AS INT64) / (100 * 24)
    AS INT64) AS total_row_cnt,

    -- total_logical_size: cumulative size (grows every hour for append)
    CAST(
      t.base_size_bytes
      + DATE_DIFF(d.d, DATE '2026-04-01', DAY) * t.daily_growth_bytes
      + CAST(h AS INT64) * (t.daily_growth_bytes / 24)
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_size_', FORMAT_DATE('%Y%m%d', d.d), '_', LPAD(CAST(h AS STRING), 2, '0'))), 10)) * CAST(t.daily_growth_bytes AS INT64) / 100
    AS INT64) AS total_logical_size

  FROM table_defs t
  CROSS JOIN daily_dates d
  CROSS JOIN UNNEST(GENERATE_ARRAY(0, 23)) AS h
  WHERE t.period = 'hourly'
),

-- Daily tables: 1 record per day (at run_hour)
daily_tables AS (
  SELECT
    t.project_name,
    t.dataset_name,
    t.table_name,
    t.issuer,
    t.period,

    -- Date in YYYYMMDD format
    FORMAT_DATE('%Y%m%d', d.d) AS date,

    -- Hour: run_hour only
    LPAD(CAST(t.run_hour AS STRING), 2, '0') AS hour,

    -- publish_time: timestamp at run_hour
    TIMESTAMP_ADD(
      TIMESTAMP(d.d, 'UTC'),
      INTERVAL t.run_hour HOUR
    ) + INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_pub_', FORMAT_DATE('%Y%m%d', d.d))), 3600)) AS INT64) SECOND
    AS publish_time,

    -- execute_dt: slightly before publish_time
    TIMESTAMP_ADD(
      TIMESTAMP(d.d, 'UTC'),
      INTERVAL t.run_hour HOUR
    ) - INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_exec_', FORMAT_DATE('%Y%m%d', d.d))), 600)) AS INT64) SECOND
    AS execute_dt,

    t.write_mode,

    -- total_row_cnt: all rows written at this run (daily delta)
    CAST(
      t.base_rows_written
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_rows_', FORMAT_DATE('%Y%m%d', d.d))), 100))
        * CAST(t.rows_written_variance AS INT64) / 100
    AS INT64) AS total_row_cnt,

    -- total_logical_size: daily snapshot (max/latest state for the day)
    CAST(
      t.base_size_bytes
      + DATE_DIFF(d.d, DATE '2026-04-01', DAY) * t.daily_growth_bytes
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_size_', FORMAT_DATE('%Y%m%d', d.d))), 30)) * CAST(t.base_size_bytes AS INT64) / 100
    AS INT64) AS total_logical_size

  FROM table_defs t
  CROSS JOIN daily_dates d
  WHERE t.period IN ('daily', 'once')
),

-- Once tables: 1 record (first day of the period)
once_tables AS (
  SELECT
    t.project_name,
    t.dataset_name,
    t.table_name,
    t.issuer,
    t.period,

    -- Date in YYYYMMDD format (first day only)
    FORMAT_DATE('%Y%m%d', DATE '2026-04-01') AS date,

    -- Hour: run_hour
    LPAD(CAST(t.run_hour AS STRING), 2, '0') AS hour,

    -- publish_time: timestamp at run_hour on first day
    TIMESTAMP_ADD(
      TIMESTAMP(DATE '2026-04-01', 'UTC'),
      INTERVAL t.run_hour HOUR
    ) + INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_pub_once')), 3600)) AS INT64) SECOND
    AS publish_time,

    -- execute_dt: slightly before publish_time
    TIMESTAMP_ADD(
      TIMESTAMP(DATE '2026-04-01', 'UTC'),
      INTERVAL t.run_hour HOUR
    ) - INTERVAL CAST(ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_exec_once')), 600)) AS INT64) SECOND
    AS execute_dt,

    t.write_mode,

    -- total_row_cnt: initial data
    CAST(
      t.base_rows_written
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_rows_once')), 100))
        * CAST(t.rows_written_variance AS INT64) / 100
    AS INT64) AS total_row_cnt,

    -- total_logical_size: initial size
    CAST(
      t.base_size_bytes
      + ABS(MOD(FARM_FINGERPRINT(CONCAT(t.table_name, '_size_once')), 30)) * CAST(t.base_size_bytes AS INT64) / 100
    AS INT64) AS total_logical_size

  FROM table_defs t
  WHERE t.period = 'once'
),

-- Union all three
hourly_data AS (
  SELECT * FROM hourly_tables
  UNION ALL
  SELECT * FROM daily_tables
  UNION ALL
  SELECT * FROM once_tables
)

-- ─────────────────────────────────────────────────────────────
-- Final output
-- ─────────────────────────────────────────────────────────────

SELECT
  project_name,
  dataset_name,
  table_name,
  issuer,
  period,
  date,
  hour,
  publish_time,
  execute_dt,
  write_mode,
  total_row_cnt,
  total_logical_size
FROM hourly_data
ORDER BY publish_time DESC, project_name, dataset_name, table_name, date, hour

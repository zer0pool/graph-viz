#!/bin/bash
# Generate demo audit log data using direct SQL
# Usage: ./generate_audit_demo_data.sh

set -e

# Database connection settings (modify as needed)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-33306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-rootpassword}"
DB_NAME="${DB_NAME:-lineage_manager}"

echo "🔧 Generating demo audit log data..."

# SQL statements to insert demo data
mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Pause Job Commands
INSERT INTO audit_log (command_type, target_id, payload, performed_by, status, visited_at) VALUES
('PAUSE_JOB', 'etl_daily_sales_report', '{"reason": "Maintenance window", "duration_hours": 2}', 'admin@company.com', 'SUCCESS', NOW() - INTERVAL 2 HOUR),
('PAUSE_JOB', 'data_quality_checker', '{"reason": "Performance issue investigation"}', 'ops.team@company.com', 'SUCCESS', NOW() - INTERVAL 5 HOUR),
('PAUSE_JOB', 'customer_360_pipeline', '{"reason": "Schema migration"}', 'data.engineer@company.com', 'FAILURE', NOW() - INTERVAL 1 DAY - INTERVAL 3 HOUR),
('PAUSE_JOB', 'realtime_event_processor', '{"reason": "Emergency hotfix deployment"}', 'devops@company.com', 'SUCCESS', NOW() - INTERVAL 3 DAY - INTERVAL 6 HOUR);

-- Resume Job Commands
INSERT INTO audit_log (command_type, target_id, payload, performed_by, status, visited_at) VALUES
('RESUME_JOB', 'etl_daily_sales_report', '{"note": "Maintenance completed"}', 'admin@company.com', 'SUCCESS', NOW() - INTERVAL 30 MINUTE),
('RESUME_JOB', 'data_quality_checker', '{"note": "Issue resolved"}', 'ops.team@company.com', 'SUCCESS', NOW() - INTERVAL 1 HOUR),
('RESUME_JOB', 'ml_training_pipeline', '{}', 'ml.engineer@company.com', 'FAILURE', NOW() - INTERVAL 4 HOUR),
('RESUME_JOB', 'realtime_event_processor', '{"note": "Hotfix deployed successfully"}', 'devops@company.com', 'SUCCESS', NOW() - INTERVAL 3 DAY - INTERVAL 4 HOUR);

-- Send Email Commands
INSERT INTO audit_log (command_type, target_id, payload, performed_by, status, visited_at) VALUES
('SEND_EMAIL', 'team-data-ops@company.com', '{"subject": "Daily Data Quality Report", "recipients": ["team-data-ops@company.com", "manager@company.com"], "template": "data_quality_summary"}', 'system@company.com', 'SUCCESS', NOW() - INTERVAL 8 HOUR),
('SEND_EMAIL', 'alerts@company.com', '{"subject": "Critical: Pipeline Failure Detected", "recipients": ["alerts@company.com", "oncall@company.com"], "priority": "HIGH"}', 'monitoring.system@company.com', 'SUCCESS', NOW() - INTERVAL 12 HOUR),
('SEND_EMAIL', 'weekly-report@company.com', '{"subject": "Weekly Data Lineage Summary", "recipients": ["leadership@company.com"]}', 'scheduler@company.com', 'FAILURE', NOW() - INTERVAL 2 DAY),
('SEND_EMAIL', 'data-governance@company.com', '{"subject": "Monthly Compliance Report", "recipients": ["data-governance@company.com", "compliance@company.com"]}', 'compliance.bot@company.com', 'SUCCESS', NOW() - INTERVAL 7 DAY);

-- Pause Job with error message
UPDATE audit_log SET error_message = 'Job is already paused' 
WHERE command_type = 'PAUSE_JOB' AND target_id = 'customer_360_pipeline' AND status = 'FAILURE';

-- Resume Job with error message
UPDATE audit_log SET error_message = 'Job not found in system' 
WHERE command_type = 'RESUME_JOB' AND target_id = 'ml_training_pipeline' AND status = 'FAILURE';

-- Send Email with error message
UPDATE audit_log SET error_message = 'SMTP connection timeout' 
WHERE command_type = 'SEND_EMAIL' AND target_id = 'weekly-report@company.com' AND status = 'FAILURE';
EOF

if [ $? -eq 0 ]; then
    echo "✅ Successfully inserted 12 demo audit log entries"
    echo "✨ Demo data generation complete!"
else
    echo "❌ Error inserting demo data"
    exit 1
fi

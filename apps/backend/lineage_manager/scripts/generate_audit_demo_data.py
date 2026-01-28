#!/usr/bin/env python3
"""
Generate demo audit log entries for demonstration purposes.
This script can be run inside the lineage-manager pod or locally with proper DB access.

Usage:
    python generate_audit_demo_data.py
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from lineage_manager.core.config import get_settings
from lineage_manager.models.audit_log import AuditLog


def generate_demo_data(session):
    """Generate sample audit log entries."""
    
    now = datetime.utcnow()
    
    demo_entries = [
        # Pause Job Commands
        AuditLog(
            command_type="PAUSE_JOB",
            target_id="etl_daily_sales_report",
            payload=json.dumps({"reason": "Maintenance window", "duration_hours": 2}),
            performed_by="admin@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(hours=2),
        ),
        AuditLog(
            command_type="PAUSE_JOB",
            target_id="data_quality_checker",
            payload=json.dumps({"reason": "Performance issue investigation"}),
            performed_by="ops.team@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(hours=5),
        ),
        AuditLog(
            command_type="PAUSE_JOB",
            target_id="customer_360_pipeline",
            payload=json.dumps({"reason": "Schema migration"}),
            performed_by="data.engineer@company.com",
            status="FAILURE",
            error_message="Job is already paused",
            visited_at=now - timedelta(days=1, hours=3),
        ),
        
        # Resume Job Commands
        AuditLog(
            command_type="RESUME_JOB",
            target_id="etl_daily_sales_report",
            payload=json.dumps({"note": "Maintenance completed"}),
            performed_by="admin@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(minutes=30),
        ),
        AuditLog(
            command_type="RESUME_JOB",
            target_id="data_quality_checker",
            payload=json.dumps({"note": "Issue resolved"}),
            performed_by="ops.team@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(hours=1),
        ),
        AuditLog(
            command_type="RESUME_JOB",
            target_id="ml_training_pipeline",
            payload=json.dumps({}),
            performed_by="ml.engineer@company.com",
            status="FAILURE",
            error_message="Job not found in system",
            visited_at=now - timedelta(hours=4),
        ),
        
        # Send Email Commands
        AuditLog(
            command_type="SEND_EMAIL",
            target_id="team-data-ops@company.com",
            payload=json.dumps({
                "subject": "Daily Data Quality Report",
                "recipients": ["team-data-ops@company.com", "manager@company.com"],
                "template": "data_quality_summary"
            }),
            performed_by="system@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(hours=8),
        ),
        AuditLog(
            command_type="SEND_EMAIL",
            target_id="alerts@company.com",
            payload=json.dumps({
                "subject": "Critical: Pipeline Failure Detected",
                "recipients": ["alerts@company.com", "oncall@company.com"],
                "priority": "HIGH"
            }),
            performed_by="monitoring.system@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(hours=12),
        ),
        AuditLog(
            command_type="SEND_EMAIL",
            target_id="weekly-report@company.com",
            payload=json.dumps({
                "subject": "Weekly Data Lineage Summary",
                "recipients": ["leadership@company.com"]
            }),
            performed_by="scheduler@company.com",
            status="FAILURE",
            error_message="SMTP connection timeout",
            visited_at=now - timedelta(days=2),
        ),
        
        # Additional varied entries for rich demo
        AuditLog(
            command_type="PAUSE_JOB",
            target_id="realtime_event_processor",
            payload=json.dumps({"reason": "Emergency hotfix deployment"}),
            performed_by="devops@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(days=3, hours=6),
        ),
        AuditLog(
            command_type="RESUME_JOB",
            target_id="realtime_event_processor",
            payload=json.dumps({"note": "Hotfix deployed successfully"}),
            performed_by="devops@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(days=3, hours=4),
        ),
        AuditLog(
            command_type="SEND_EMAIL",
            target_id="data-governance@company.com",
            payload=json.dumps({
                "subject": "Monthly Compliance Report",
                "recipients": ["data-governance@company.com", "compliance@company.com"]
            }),
            performed_by="compliance.bot@company.com",
            status="SUCCESS",
            visited_at=now - timedelta(days=7),
        ),
    ]
    
    # Insert all entries
    for entry in demo_entries:
        session.add(entry)
    
    session.commit()
    print(f"✅ Successfully inserted {len(demo_entries)} demo audit log entries")


def main():
    """Main execution."""
    settings = get_settings()
    
    # Create engine
    engine = create_engine(settings.database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔧 Generating demo audit log data...")
        generate_demo_data(session)
        print("✨ Demo data generation complete!")
    except Exception as e:
        print(f"❌ Error generating demo data: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()

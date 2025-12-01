#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines return the exit status of the last command that failed.
set -o pipefail

# --- Configuration ---
readonly DEFAULT_DB_HOST="127.0.0.1"
readonly DEFAULT_DB_PORT="3306"
readonly DEFAULT_DB_NAME="lineage_manager"
readonly DEFAULT_DB_USER="ss_admin"

# --- Helper Functions ---

# MySQL 연결 확인
mysql_ready() {
    local db_host="${DEFAULT_DB_HOST}"
    local db_port="${DEFAULT_DB_PORT}"
    local db_name="${DEFAULT_DB_NAME}"
    local db_user="${DEFAULT_DB_USER}"
    local db_password="${DB_PASSWORD:-}"

    python3 << PYTHON_END
import os
import sys
import pymysql

db_host = os.environ.get("DB_HOST", "$db_host")
db_port = int(os.environ.get("DB_PORT", "$db_port"))
db_name = os.environ.get("DB_NAME", "$db_name")
db_user = os.environ.get("DB_USER", "$db_user")
db_password = os.environ.get("DB_PASSWORD", "$db_password")

try:
    conn = pymysql.connect(
        db=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port,
        connect_timeout=5
    )
    print(f"[mysql_ready] MySQL connection successful to {db_host}:{db_port}/{db_name}", file=sys.stdout)
    conn.close()
    sys.exit(0)
except pymysql.Error as e:
    print(f"[mysql_ready] MySQL connection error: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"[mysql_ready] Unexpected error during MySQL check: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_END
}

# MySQL 대기
wait_for_mysql() {
    local wait_attempts=0
    local max_wait_attempts=60
    until mysql_ready; do
        wait_attempts=$((wait_attempts + 1))
        if [ "$wait_attempts" -ge "$max_wait_attempts" ]; then
            echo >&2 "Error: MySQL did not become available after $max_wait_attempts seconds."
            exit 1
        fi
        echo >&2 "Waiting for MySQL to become available... (Attempt: $wait_attempts/$max_wait_attempts)"
        sleep 10
    done
    echo "MySQL is available."
}

# --- Main Execution Logic ---
CMD="${1:-backend}"
shift
shift_args=("$@")

 
case "$CMD" in
    backend)
        echo "Starting Lineage Manager..."
        wait_for_mysql
        exec uvicorn src.lineage_manager.main:app --host 0.0.0.0 --port 5003 --workers 1 --log-level warning

        ;;
    print-config)
        echo "Printing Lineage Manager Configuration..."
        python3 -m src.lineage_manager.core.config
        ;;
    *)
        echo >&2 "Error: Invalid command '$CMD'"
        echo >&2 "Usage: $0 [backend|print-config] [args...]"
        exit 1
        ;;
esac

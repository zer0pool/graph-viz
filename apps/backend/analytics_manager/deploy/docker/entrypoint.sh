#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines return the exit status of the last command that failed.
set -o pipefail

# --- Helper Functions ---

# Lineage Manager V2 상태 확인
lineage_ready() {
    local lineage_url="http://lineage-api:5003/api/v1/health"
    echo "Checking Lineage Manager V2 health at $lineage_url..."
    
    # curl로 응답 확인 (HTTP 200만 성공으로 간주)
    if curl -s -f "$lineage_url" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Lineage Manager V2 대기
wait_for_lineage() {
    local wait_attempts=0
    local max_wait_attempts=60
    until lineage_ready; do
        wait_attempts=$((wait_attempts + 1))
        if [ "$wait_attempts" -ge "$max_wait_attempts" ]; then
            echo >&2 "Error: Lineage Manager V2 did not become healthy after $max_wait_attempts seconds."
            exit 1
        fi
        echo >&2 "Waiting for Lineage Manager V2... (Attempt: $wait_attempts/$max_wait_attempts)"
        sleep 5
    done
    echo "Lineage Manager V2 is healthy."
}

# --- Main Execution Logic ---
CMD="${1:-backend}"

case "$CMD" in
    backend)
        echo "Starting Analytics Manager..."
        wait_for_lineage
        exec uvicorn app.main:app --host 0.0.0.0 --port 5004 --workers 1 --root-path "${ROOT_PATH:-}"
        ;;
    *)
        echo >&2 "Error: Invalid command '$CMD'"
        echo >&2 "Usage: $0 [backend]"
        exit 1
        ;;
esac

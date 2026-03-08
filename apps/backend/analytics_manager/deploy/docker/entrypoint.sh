#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipelines return the exit status of the last command that failed.
set -o pipefail

# --- Helper Functions ---

# Redis 상태 확인
redis_ready() {
    python3 << PYTHON_END
import os
import sys
import socket
import asyncio
from redis.asyncio import Redis

async def check():
    host = os.environ.get("REDIS_HOST", "redis-cache")
    port = int(os.environ.get("REDIS_PORT", 6379))
    try:
        print(f"[redis_ready] Attempting to resolve {host}...", file=sys.stdout)
        ip = socket.gethostbyname(host)
        print(f"[redis_ready] {host} resolved to {ip}", file=sys.stdout)
        
        client = Redis(host=host, port=port, socket_connect_timeout=5)
        await client.ping()
        print(f"[redis_ready] Redis connection successful to {host}:{port}", file=sys.stdout)
        await client.aclose()
        return True
    except Exception as e:
        print(f"[redis_ready] Connection failed: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if asyncio.run(check()):
        sys.exit(0)
    else:
        sys.exit(1)
PYTHON_END
}

# Redis 대기
wait_for_redis() {
    local wait_attempts=0
    local max_wait_attempts=60
    until redis_ready; do
        wait_attempts=$((wait_attempts + 1))
        if [ "$wait_attempts" -ge "$max_wait_attempts" ]; then
            echo >&2 "Error: Redis did not become available after $max_wait_attempts seconds."
            exit 1
        fi
        echo >&2 "Waiting for Redis... (Attempt: $wait_attempts/$max_wait_attempts)"
        sleep 5
    done
    echo "Redis is available."
}

# --- Main Execution Logic ---
CMD="${1:-backend}"

case "$CMD" in
    backend)
        echo "Starting Analytics Manager..."
        wait_for_redis
        # wait_for_lineage
        exec uvicorn app.main:app --host 0.0.0.0 --port 5004 --workers 1 --log-level info
        ;;
    *)
        echo >&2 "Error: Invalid command '$CMD'"
        echo >&2 "Usage: $0 [backend]"
        exit 1
        ;;
esac

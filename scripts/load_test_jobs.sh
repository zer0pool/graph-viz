#!/usr/bin/env bash
set -euo pipefail

# Seed 10 chained test jobs into the Graph Manager API.
# - Resets the graph first (clears all data)
# - Registers TEST_01..TEST_10
# - Each job reads from the previous job's output table to form a linear chain
#
# Usage:
#   BASE_URL=http://localhost:5003 bash scripts/load_test_jobs.sh
#
# BASE_URL defaults to http://localhost:5003 if not provided.

BASE_URL=${BASE_URL:-http://localhost:5003}
# BigQuery-style identifiers (project.dataset.table)
PROJECT_ID=${PROJECT_ID:-demo}
DATASET_ID=${DATASET_ID:-analytics}

full_table() {
  # $1 = table name (e.g., TABLE_06)
  echo "${PROJECT_ID}.${DATASET_ID}.$1"
}

echo "[INFO] Using BASE_URL=${BASE_URL}"

reset_graph() {
  echo "[INFO] Resetting graph..."
  curl -sS -X POST "${BASE_URL}/api/v1/graph/reset" \
    -H 'Content-Type: application/json' \
    --fail || {
      echo "[ERROR] Graph reset failed" >&2
      exit 1
    }
  echo "[INFO] Graph reset complete."
}

register_job() {
  local idx="$1"

  local num
  num=$(printf "%02d" "${idx}")
  local job_id="JOB_TEST_${num}"
  local name="TEST_${num}"
  local dest_table_name="TABLE_${num}"
  local dest_table
  dest_table=$(full_table "${dest_table_name}")
  
  echo "[INFO] register_job ${job_id}"

  # Build reference tables (1 to 3 sources):
  # - Always include previous job's output (except first job uses a source seed)
  # - Add 0-2 additional SOURCE_TABLE_XX entries deterministically by index
  local ref_tables=()
  if [[ "${idx}" -eq 1 ]]; then
    ref_tables+=("$(full_table SOURCE_TABLE_00)")
  else
    ref_tables+=( "$(full_table "$(printf "TABLE_%02d" $((idx-1)))")" )
  fi

  # Determine how many extra sources to add (0, 1 or 2)
  local extra_count=$(( (idx - 1) % 3 ))
  if (( extra_count >= 1 )); then
    ref_tables+=("$(full_table "$(printf "SOURCE_TABLE_%02d" "${idx}")")")
  fi
  if (( extra_count >= 2 )); then
    ref_tables+=("$(full_table "$(printf "SOURCE_TABLE_%02d" $((idx+10)))")")
  fi

  # Convert bash array -> JSON array string with trigger information
  local upstream_entries=()
  for tbl in "${ref_tables[@]}"; do
    upstream_entries+=("{\"type\":\"table\",\"name\":\"${tbl}\",\"trigger\":true}")
  done
  local upstreams_json="[]"
  if ((${#upstream_entries[@]} > 0)); then
    local joined_upstreams
    joined_upstreams=$(printf "%s," "${upstream_entries[@]}")
    upstreams_json="[${joined_upstreams%,}]"
  fi

  # Optionally include an s3 destination reference on a couple of jobs
  local destinations_json="[]"
  if [[ "${idx}" -eq 5 || "${idx}" -eq 10 ]]; then
    destinations_json="[{\"type\":\"s3\",\"path\":\"s3://test-bucket/${name}\",\"table_name\":\"output\"}]"
  fi

  # Build JSON payload (metadata captures ownership/run config)
  payload=$(cat <<JSON
{
  "type": "SELF-TYPE",
  "job_id": "${job_id}",
  "name": "${name}",
  "upstreams": ${upstreams_json},
  "downstreams": [{"type":"table","name":"${dest_table}"}],
  "destination_type": "table",
  "metadata": {
    "labels": {"env": "test", "batch": ${idx}},
    "owner": "tester",
    "write_mode": "append",
    "run_status": "RUN",
    "schedule": {"cron": "@daily"},
    "destinations": ${destinations_json},
    "note": "seeded by load_test_jobs.sh"
  }
}
JSON
  )
  echo "[INFO] Registering ${job_id} (upstreams: ${upstreams_json} -> dest: ${dest_table})"
  curl -sS -X POST "${BASE_URL}/api/v1/graph/jobs/lineage" \
    -H 'Content-Type: application/json' \
    -d "${payload}" \
    --fail > /dev/null || {
      echo "[ERROR] Failed to register ${job_id}" >&2
      echo "Payload: ${payload}" >&2
      exit 1
    }
}

main() {
  reset_graph
  for i in $(seq 1 10); do
    register_job "${i}"
  done

  # ---- Additional consumer jobs (10 more) ----
  # Goal: ensure some tables are consumed by 2~5 different jobs for testing
  # Plan: add 10 extra jobs that read existing TABLE_05, TABLE_06, TABLE_07
  #  - TABLE_06: +4 consumers => up to 5 including chain
  #  - TABLE_05: +3 consumers
  #  - TABLE_07: +3 consumers

  register_consumer_job() {
    local cidx="$1"          # 1..10
    local base_table="$2"     # e.g., TABLE_06
    local jnum
    jnum=$(printf "%02d" "${cidx}")
    local job_id="JOB_EXTRA_${jnum}"
    local name="EX_JOB_${jnum}"
    local dest_table="EXTRA_TABLE_${jnum}"

    local upstreams_json="[{\"type\":\"table\",\"name\":\"${base_table}\",\"trigger\":true}]"
    payload=$(cat <<JSON
{
  "type": "SELF-TYPE",
  "job_id": "${job_id}",
  "name": "${name}",
  "upstreams": ${upstreams_json},
  "downstreams": [{"type":"table","name":"${dest_table}"}],
  "destination_type": "table",
  "metadata": {
    "labels": {"env": "test", "kind": "extra_consumer", "base": "${base_table}"},
    "owner": "tester",
    "write_mode": "append",
    "run_status": "RUN",
    "schedule": {"cron": "@hourly"},
    "note": "seeded extra consumer"
  }
}
JSON
    )
    echo "[INFO] Registering extra ${job_id} (reads: ${base_table} -> dest: ${dest_table})"
    curl -sS -X POST "${BASE_URL}/api/v1/graph/jobs/lineage" \
      -H 'Content-Type: application/json' \
      -d "${payload}" \
      --fail > /dev/null || {
        echo "[ERROR] Failed to register ${job_id}" >&2
        echo "Payload: ${payload}" >&2
        exit 1
      }
  }

  # Distribution plan: 4 for TABLE_06, 3 for TABLE_05, 3 for TABLE_07 (all fully-qualified)
  local extra_idx=1
  for _ in 1 2 3 4; do
    register_consumer_job "${extra_idx}" "$(full_table TABLE_06)"; extra_idx=$((extra_idx+1))
  done
  for _ in 1 2 3; do
    register_consumer_job "${extra_idx}" "$(full_table TABLE_05)"; extra_idx=$((extra_idx+1))
  done
  for _ in 1 2 3; do
    register_consumer_job "${extra_idx}" "$(full_table TABLE_07)"; extra_idx=$((extra_idx+1))
  done

  echo "[INFO] Seed complete: 20 jobs created (10 chained + 10 extra consumers)."
}

main "$@"

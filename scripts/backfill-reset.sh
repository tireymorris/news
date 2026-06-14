#!/usr/bin/env bash
set -euo pipefail

state_file="${BACKFILL_STATE_FILE:-backfill.state.json}"

printf '%s\n' '{"completed":[],"retry":{}}' >"$state_file"
echo "Reset $state_file"

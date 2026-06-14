#!/usr/bin/env bash
set -euo pipefail

command="${1:-daily}"
shift || true

case "$command" in
  daily)
    exec bun run src/backfill/cli.ts daily "$@"
    ;;
  range|reset|repair-published-at|repair-ap-titles|cleanup-ap|help)
    exec bun run src/backfill/cli.ts "$command" "$@"
    ;;
  *)
    echo "Unknown backfill command: $command" >&2
    echo "Usage: scripts/backfill.sh [daily|range|reset|repair-published-at|repair-ap-titles|cleanup-ap]" >&2
    exit 1
    ;;
esac

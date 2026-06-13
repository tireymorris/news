#!/usr/bin/env bash
set -euo pipefail

db="${LOCAL_DB:-articles.db}"
state="${BACKFILL_STATE_FILE:-backfill-monthly.state.json}"
interval="${BACKFILL_PROGRESS_INTERVAL:-30}"

while true; do
  echo "=== $(date -Is) ==="

  sqlite3 -header -column "$db" <<'SQL'
SELECT source,
       COUNT(*) AS articles,
       MIN(date(published_at)) AS earliest,
       MAX(date(published_at)) AS latest
FROM articles
WHERE source IN ('NPR', 'AP News')
GROUP BY source
ORDER BY source;

SELECT 'historical NPR months' AS metric,
       COUNT(DISTINCT strftime('%Y-%m', published_at)) AS value
FROM articles
WHERE source = 'NPR'
  AND published_at < '2025-06-01';

SELECT strftime('%Y-%m', published_at) AS ym,
       SUM(CASE WHEN source = 'NPR' THEN 1 ELSE 0 END) AS npr,
       SUM(CASE WHEN source = 'AP News' THEN 1 ELSE 0 END) AS ap
FROM articles
WHERE source IN ('NPR', 'AP News')
  AND published_at < '2025-06-01'
GROUP BY ym
ORDER BY ym DESC
LIMIT 5;
SQL

  if [[ -f "$state" ]]; then
    python3 - <<PY
import json
from pathlib import Path

state = json.loads(Path("$state").read_text())
completed = set(state.get("completed", []))
retry = state.get("retry", {})
print(f"state  completed={len(completed)}  retry={len(retry)}")
if retry:
    for month, entry in sorted(retry.items()):
        print(f"retry  {month}  attempts={entry['attempts']}  issues={entry['issues']}")
PY
  fi

  echo
  sleep "$interval"
done

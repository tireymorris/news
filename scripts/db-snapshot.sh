#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/provider-sources.sh"

db="${LOCAL_DB:-articles.db}"
label="${1:-baseline}"
timestamp="$(date +%Y%m%d_%H%M%S)"
snapshot_dir="${SNAPSHOT_DIR:-snapshots}"
snapshot="${snapshot_dir}/${label}.${timestamp}.sql"
sources="${SOURCES:-$(default_provider_sources)}"
sources_sql_in="$(provider_sources_sql_in "$sources")"

if [[ ! -f "$db" ]]; then
  echo "Database not found: $db" >&2
  exit 1
fi

mkdir -p "$snapshot_dir"

sqlite3 "$db" <<SQL > "$snapshot"
.mode column
.headers on
SELECT 'source_counts' AS section;
SELECT source, COUNT(*) AS articles,
       MIN(date(published_at)) AS earliest,
       MAX(date(published_at)) AS latest
FROM articles
GROUP BY source
ORDER BY source;

SELECT 'monthly_provider_coverage' AS section;
SELECT strftime('%Y-%m', published_at) AS month, source, COUNT(*) AS articles
FROM articles
WHERE source IN ($sources_sql_in)
GROUP BY month, source
ORDER BY month, source;

SELECT 'all_links' AS section;
SELECT source, link
FROM articles
ORDER BY source, link;
SQL

echo "Wrote snapshot to $snapshot"

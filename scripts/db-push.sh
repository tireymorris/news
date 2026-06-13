#!/usr/bin/env bash
set -euo pipefail

app="${FLY_APP:-hyperwave-news}"
remote_db="${REMOTE_DB:-/app/data/articles.db}"
local_db="${LOCAL_DB:-articles.db}"
timestamp="$(date +%Y%m%d_%H%M%S)"
remote_backup="${remote_db}.backup.${timestamp}"
confirm="${CONFIRM_DB_PUSH:-}"

if [[ ! -f "$local_db" ]]; then
  echo "Local database not found: $local_db" >&2
  exit 1
fi

integrity_result="$(sqlite3 "$local_db" 'PRAGMA integrity_check;')"
if [[ "$integrity_result" != "ok" ]]; then
  echo "SQLite integrity check failed for $local_db:" >&2
  echo "$integrity_result" >&2
  exit 1
fi

echo "Local database summary:"
sqlite3 -header -column "$local_db" <<'SQL'
SELECT source,
       COUNT(*) AS articles,
       MIN(date(published_at)) AS earliest,
       MAX(date(published_at)) AS latest
FROM articles
WHERE source IN ('NPR', 'AP News')
GROUP BY source
ORDER BY source;
SQL

if [[ "$confirm" != "yes" ]]; then
  echo
  echo "Refusing to push without CONFIRM_DB_PUSH=yes."
  echo "Run: CONFIRM_DB_PUSH=yes bun run db:push"
  exit 1
fi

echo
echo "Backing up remote database on Fly app $app..."
fly ssh console --app "$app" -C "cp '$remote_db' '$remote_backup'"

echo "Uploading $local_db to $remote_db..."
fly sftp put "$local_db" "$remote_db" --app "$app"

echo "Verifying remote database integrity..."
remote_integrity="$(fly ssh console --app "$app" -C "sqlite3 '$remote_db' 'PRAGMA integrity_check;'")"
if [[ "$remote_integrity" != "ok" ]]; then
  echo "Remote integrity check failed. Restoring backup..." >&2
  fly ssh console --app "$app" -C "mv '$remote_backup' '$remote_db'"
  exit 1
fi

echo "Remote database summary:"
fly ssh console --app "$app" -C "sqlite3 '$remote_db' \"SELECT source, COUNT(*) AS articles, MIN(date(published_at)) AS earliest, MAX(date(published_at)) AS latest FROM articles WHERE source IN ('NPR', 'AP News') GROUP BY source ORDER BY source;\""

echo "Push complete. Remote backup: $remote_backup"

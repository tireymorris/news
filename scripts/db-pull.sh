#!/usr/bin/env bash
set -euo pipefail

app="${FLY_APP:-hyperwave-news}"
remote_db="${REMOTE_DB:-/app/data/articles.db}"
local_db="${LOCAL_DB:-articles.db}"
timestamp="$(date +%Y%m%d_%H%M%S)"
download="${local_db}.production.${timestamp}"

cleanup() {
  if [[ -f "$download" && ! -f "$local_db" ]]; then
    echo "Downloaded database remains at $download"
  fi
}
trap cleanup EXIT

echo "Downloading $remote_db from Fly app $app to $download..."
fly sftp get "$remote_db" "$download" --app "$app"

integrity_result="$(sqlite3 "$download" 'PRAGMA integrity_check;')"
if [[ "$integrity_result" != "ok" ]]; then
  echo "SQLite integrity check failed for $download:" >&2
  echo "$integrity_result" >&2
  exit 1
fi

if [[ -f "$local_db" ]]; then
  backup="${local_db}.backup.${timestamp}"
  previous="${local_db}.local.old.${timestamp}"
  cp "$local_db" "$backup"
  mv "$local_db" "$previous"
  echo "Backed up existing local database to $backup"
  echo "Moved previous local database to $previous"
else
  echo "No existing $local_db found; installing downloaded database without a local backup."
fi

mv "$download" "$local_db"
size_mb="$(python3 - <<PY
import os
print(f'{os.path.getsize("$local_db") / (1024 * 1024):.2f}')
PY
)"
echo "Installed $local_db (${size_mb} MB)."

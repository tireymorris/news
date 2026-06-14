#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/lib/provider-sources.sh"

db="${LOCAL_DB:-articles.db}"
sources="${SOURCES:-$(default_provider_sources)}"
sources_sql_in="$(provider_sources_sql_in "$sources")"
sources_union_sql="$(provider_sources_union_sql "$sources")"
ap_source_name="$(provider_name_by_id ap)"
month="${MONTH:-}"
strict="${STRICT:-0}"
min_daily="${MIN_DAILY_ARTICLES:-1}"
issues=0

record_issue() {
  echo "$1" >&2
  issues=$((issues + 1))
}

if [[ ! -f "$db" ]]; then
  echo "Database not found: $db" >&2
  exit 1
fi

integrity_result="$(sqlite3 "$db" 'PRAGMA integrity_check;')"
if [[ "$integrity_result" != "ok" ]]; then
  echo "SQLite integrity check failed:" >&2
  echo "$integrity_result" >&2
  exit 1
fi

month_clause=""
if [[ -n "$month" ]]; then
  month_clause="AND strftime('%Y-%m', published_at) = '$month'"
fi

size_mb="$(python3 - <<PY
import os
print(f'{os.path.getsize("$db") / (1024 * 1024):.2f}')
PY
)"

echo "=== $db (${size_mb} MB)${month:+ · month=$month} · sources=$sources ==="
echo

sqlite3 -header -column "$db" <<SQL
SELECT source,
       COUNT(*) AS articles,
       MIN(date(published_at)) AS earliest,
       MAX(date(published_at)) AS latest
FROM articles
WHERE source IN ($sources_sql_in)
  $month_clause
GROUP BY source
ORDER BY source;
SQL

echo
echo "=== quality checks ($sources) ==="
sqlite3 -header -column "$db" <<SQL
SELECT
  SUM(CASE WHEN published_at IS NULL THEN 1 ELSE 0 END) AS null_published_at,
  SUM(CASE WHEN published_at = created_at THEN 1 ELSE 0 END) AS published_equals_created,
  SUM(CASE WHEN title IS NULL OR trim(title) = '' THEN 1 ELSE 0 END) AS empty_titles,
  SUM(CASE WHEN link IS NULL OR trim(link) = '' THEN 1 ELSE 0 END) AS empty_links
FROM articles
WHERE source IN ($sources_sql_in)
  $month_clause;
SQL

echo
echo "=== duplicate links / titles ==="
sqlite3 -header -column "$db" <<SQL
SELECT 'duplicate_links' AS issue, COUNT(*) AS groups
FROM (
  SELECT link
  FROM articles
  WHERE source IN ($sources_sql_in)
    $month_clause
  GROUP BY link
  HAVING COUNT(*) > 1
)
UNION ALL
SELECT 'duplicate_titles' AS issue, COUNT(*) AS groups
FROM (
  SELECT title
  FROM articles
  WHERE source IN ($sources_sql_in)
    $month_clause
  GROUP BY title
  HAVING COUNT(*) > 1
);
SQL

echo
echo "=== monthly coverage ($sources) ==="
sqlite3 -header -column "$db" <<SQL
SELECT strftime('%Y-%m', published_at) AS month,
       source,
       COUNT(*) AS articles
FROM articles
WHERE source IN ($sources_sql_in)
  AND published_at IS NOT NULL
GROUP BY month, source
ORDER BY month, source;
SQL

echo
echo "=== zero-article months (possible gaps) ==="
sqlite3 -header -column "$db" <<SQL
WITH months AS (
  SELECT DISTINCT strftime('%Y-%m', published_at) AS month
  FROM articles
  WHERE source IN ($sources_sql_in)
    AND published_at IS NOT NULL
),
sources AS (
  $sources_union_sql
),
expected AS (
  SELECT months.month, sources.source
  FROM months
  CROSS JOIN sources
),
actual AS (
  SELECT strftime('%Y-%m', published_at) AS month, source, COUNT(*) AS articles
  FROM articles
  WHERE source IN ($sources_sql_in)
    AND published_at IS NOT NULL
  GROUP BY month, source
)
SELECT expected.month, expected.source, COALESCE(actual.articles, 0) AS articles
FROM expected
LEFT JOIN actual
  ON actual.month = expected.month
 AND actual.source = expected.source
WHERE COALESCE(actual.articles, 0) = 0
ORDER BY expected.month, expected.source;
SQL

if [[ "$strict" == "1" ]]; then
  null_published_at="$(sqlite3 "$db" "SELECT COUNT(*) FROM articles WHERE source IN ($sources_sql_in) $month_clause AND published_at IS NULL;")"
  duplicate_links="$(sqlite3 "$db" "SELECT COUNT(*) FROM (SELECT link FROM articles WHERE source IN ($sources_sql_in) $month_clause GROUP BY link HAVING COUNT(*) > 1);")"
  duplicate_titles="$(sqlite3 "$db" "SELECT COUNT(*) FROM (SELECT title FROM articles WHERE source IN ($sources_sql_in) $month_clause GROUP BY title HAVING COUNT(*) > 1);")"

  [[ "$null_published_at" != "0" ]] && record_issue "strict: $null_published_at null published_at values"
  [[ "$duplicate_links" != "0" ]] && record_issue "strict: $duplicate_links duplicate link groups"
  [[ "$duplicate_titles" != "0" ]] && record_issue "strict: $duplicate_titles duplicate title groups"
  if [[ -n "$month" ]]; then
    while IFS= read -r source_name; do
      [[ -z "$source_name" ]] && continue
      escaped_source_name="${source_name//\'/\'\'}"
      sparse_days="$(sqlite3 "$db" <<SQL
WITH RECURSIVE days(day) AS (
  SELECT date('$month-01')
  UNION ALL
  SELECT date(day, '+1 day')
  FROM days
  WHERE day < date('$month-01', '+1 month', '-1 day')
),
counts AS (
  SELECT date(published_at) AS day, COUNT(*) AS articles
  FROM articles
  WHERE source = '$escaped_source_name'
    AND strftime('%Y-%m', published_at) = '$month'
  GROUP BY day
)
SELECT COUNT(*)
FROM days
LEFT JOIN counts ON counts.day = days.day
WHERE COALESCE(counts.articles, 0) < $min_daily;
SQL
)"
      if [[ "$sparse_days" == "0" ]]; then
        continue
      fi

      if [[ "$source_name" == "$ap_source_name" ]]; then
        ap_month_total="$(sqlite3 "$db" "SELECT COUNT(*) FROM articles WHERE source = '$escaped_source_name' AND strftime('%Y-%m', published_at) = '$month';")"
        if [[ "$ap_month_total" -eq 0 ]]; then
          continue
        fi
      fi

      record_issue "strict: $source_name sparse on $sparse_days days in $month (minimum $min_daily per day)"
    done < <(provider_sources_lines "$sources")
  fi

  if [[ "$issues" -gt 0 ]]; then
    echo "Validation failed with $issues issue(s)." >&2
    exit 1
  fi

  echo "Strict validation passed${month:+ for $month}."
fi

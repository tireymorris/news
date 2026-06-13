# Historical backfill — work in progress

## Overall goal

Backfill NPR and AP News articles as far back as sources allow, validate data quality month by month, and eventually push the local `articles.db` to production once coverage and integrity are verified with no regressions or data loss.

## Current status

Autonomous monthly backfill runs locally with auto-restart on transient failures:

- **Orchestrator:** `bun run backfill:monthly` → supervisor + `src/backfill/monthlyRun.ts`
- **Direction:** backward from `2026-06` to `2010-01` (198 months)
- **State file:** `backfill-monthly.state.json` (resume checkpoint; not committed)
- **Log:** `backfill-monthly.log`
- **PID:** `backfill-monthly.pid`

Completed via validation skip (crawler data already good): `2026-06` through `2025-06`.

Currently working backward from `2025-04`.

## How each month works

1. Check whether the month already passes validation → skip if yes.
2. Backfill NPR day-by-day for the month (`--sleep-ms=500`).
3. Backfill AP News once per month via optimized sitemap fetch (not per-day).
4. Validate month: article counts, no duplicate links/titles, no null `published_at`.
5. On any failed attempt, queue the month for retry with exponential backoff and continue with other months.
6. Retry queue is revisited until every month validates; nothing is permanently failed.
7. Mark month complete in state file and continue until all months are done.

## Tooling

| Command | Purpose |
|---------|---------|
| `bun run backfill:monthly` | Start/resume autonomous monthly backfill |
| `bun run backfill YYYY-MM-DD [YYYY-MM-DD] --source=NPR\|AP News` | Manual date-range backfill |
| `bun run db:validate` | Full DB quality report |
| `MONTH=2025-05 STRICT=1 bun run db:validate` | Strict per-month validation |
| `bun run db:snapshot baseline` | Snapshot counts/links before prod push |
| `bun run db:pull` | Pull prod DB locally |
| `CONFIRM_DB_PUSH=yes bun run db:push` | Push local DB to Fly (after validation) |
| `bun run published-at:repair` | Fix `published_at` on existing rows (optional) |

## Before pushing to prod

- [ ] Monthly backfill complete through `2010-01` (or earliest reliable month per source)
- [ ] `bun run db:validate` passes with no duplicate links/titles or null dates
- [ ] `bun run db:snapshot pre-push` saved for regression comparison
- [ ] `bun test` green
- [ ] Spot-check sparse months (early AP sitemaps, NPR archive gaps)
- [ ] Confirm local article count ≥ prod for overlapping date range
- [ ] `CONFIRM_DB_PUSH=yes bun run db:push` with Fly app running

## Known constraints

- AP sitemaps start around `2006-02`; months without a sitemap skip AP requirement.
- NPR archive is reliable back to ~2010; detail-page fetches can timeout (skipped, not fatal).
- Full run is multi-day at `--sleep-ms=500`; state file enables safe resume.
- `published-at:repair` is separate from backfill — only needed for older crawler-sourced rows.

## Source coverage targets

| Source | Earliest target | Adapter |
|--------|----------------|---------|
| NPR | `2010-01` | NPR news archive pages |
| AP News | `2006-02` (when sitemap exists) | AP monthly sitemaps + article pages |

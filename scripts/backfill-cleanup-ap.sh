#!/usr/bin/env bash
set -euo pipefail

bun run src/backfill/cleanupApBackfill.ts

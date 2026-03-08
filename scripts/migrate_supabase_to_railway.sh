#!/usr/bin/env bash

set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [[ -z "${SUPABASE_DATABASE_URL:-}" ]]; then
  echo "SUPABASE_DATABASE_URL is not set." >&2
  exit 1
fi

if [[ -z "${RAILWAY_DATABASE_URL:-}" ]]; then
  echo "RAILWAY_DATABASE_URL is not set." >&2
  exit 1
fi

if [[ "${MIGRATION_CONFIRM:-}" != "YES" ]]; then
  cat >&2 <<'EOF'
This script restores data into Railway DB and may overwrite existing data.
Set MIGRATION_CONFIRM=YES to continue.
EOF
  exit 1
fi

WORKDIR="${WORKDIR:-./tmp/migration}"
DUMP_FILE="$WORKDIR/supabase.dump"
mkdir -p "$WORKDIR"

echo "[1/4] Dumping Supabase database..."
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --dbname="$SUPABASE_DATABASE_URL" \
  --file="$DUMP_FILE"

echo "[2/4] Restoring dump into Railway database..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$RAILWAY_DATABASE_URL" \
  "$DUMP_FILE"

echo "[3/4] Running Prisma migrate deploy against Railway..."
DATABASE_URL="$RAILWAY_DATABASE_URL" npx prisma migrate deploy

echo "[4/4] Migration completed successfully."
echo "Next: switch app DATABASE_URL to Railway and run smoke tests."

#!/usr/bin/env bash
set -euo pipefail
npm run build -w apps/api
# Dedicated, ephemeral database; production/demo data is never truncated.
TEST_DB="orderflow_test_$(date +%s)_$$"
docker compose exec -T db createdb -U orderflow "$TEST_DB"
cleanup() { docker compose exec -T db dropdb -U orderflow --force "$TEST_DB"; }
trap cleanup EXIT
export DATABASE_URL="postgres://orderflow:${POSTGRES_PASSWORD:-orderflow-local-only}@localhost:5432/$TEST_DB"
npm run migrate -w apps/api
npm run test:integration

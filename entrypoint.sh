#!/bin/bash
set -e

echo "DATABASE_URL is set: ${DATABASE_URL:+yes}${DATABASE_URL:-NO - variable is missing}"
echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

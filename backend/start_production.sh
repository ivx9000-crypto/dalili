#!/usr/bin/env sh
set -e

echo "Starting Dalili production backend"
echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI on port ${PORT:-8000}"
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

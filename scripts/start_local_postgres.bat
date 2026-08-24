@echo off
echo Starting Dalili local PostgreSQL container...
docker compose up -d postgres
echo.
echo PostgreSQL URL:
echo postgresql+psycopg2://dalili_user:dalili_password@localhost:5432/dalili
echo.
docker compose ps
